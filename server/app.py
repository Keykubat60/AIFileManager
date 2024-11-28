from flask import Flask, request, jsonify
from flask_cors import CORS
import json
from haystack import Pipeline, Document
from haystack_integrations.document_stores.elasticsearch import ElasticsearchDocumentStore
from haystack_integrations.components.retrievers.elasticsearch import ElasticsearchBM25Retriever, ElasticsearchEmbeddingRetriever
from haystack.components.preprocessors import DocumentSplitter
from haystack.components.embedders import SentenceTransformersTextEmbedder, SentenceTransformersDocumentEmbedder
import pdfplumber
import os
from datetime import datetime
import uuid
import logging
import fitz
from haystack.document_stores.types import DuplicatePolicy
from openai import OpenAI
from dotenv import load_dotenv
import re

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)
# Initialize Haystack components
try:
    document_store = ElasticsearchDocumentStore(
        hosts="http://localhost:9200", index  = "test_index"
    )

    model = "BAAI/bge-large-en-v1.5"
    document_embedder = SentenceTransformersDocumentEmbedder(model=model)  
    document_embedder.warm_up()

    retriever = ElasticsearchBM25Retriever(
        document_store=document_store
    )
    
    #search_pipeline = Pipeline()
    #search_pipeline.add_component("retriever", retriever)
    query_pipeline = Pipeline()
    query_pipeline.add_component("text_embedder", SentenceTransformersTextEmbedder(model=model))
    query_pipeline.add_component("retriever", ElasticsearchEmbeddingRetriever(document_store=document_store))
    query_pipeline.connect("text_embedder.embedding", "retriever.query_embedding")
    count = document_store.count_documents()
    print(count)
    logger.info("Successfully initialized Haystack components")
except Exception as e:
    logger.error(f"Failed to initialize Haystack components: {str(e)}")
    raise

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
print(UPLOAD_FOLDER)
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
    logger.info(f"Created upload folder at {UPLOAD_FOLDER}")

def extract_text_from_pdf(pdf_path):
    try:
        text = ""
        with fitz.open(pdf_path) as pdf:
            for page in pdf:
                text += page.get_text() + "\n"
        text = re.sub(r'(\.{2,}|\-{2,})', '', text)
        return text
    except Exception as e:
        logger.error(f"Error extracting text from PDF: {str(e)}")
        raise

def suggest_folder(content):
    if not content:
        return 'Sonstiges'
        
    content = content.lower()
    if 'rechnung' in content:
        return 'Rechnungen'
    elif 'vertrag' in content:
        return 'Verträge'
    elif 'bericht' in content:
        return 'Berichte'
    return 'Sonstiges'

@app.route('/upload', methods=['POST'])
def upload_file():
    try:
        logger.info("Processing file upload request")
        
        if 'pdf' not in request.files:
            logger.warning("No file part in request")
            return jsonify({'error': 'No file part'}), 400
        
        file = request.files['pdf']
        if file.filename == '':
            logger.warning("No selected file")
            return jsonify({'error': 'No selected file'}), 400

        if not file.filename.lower().endswith('.pdf'):
            logger.warning("Invalid file type")
            return jsonify({'error': 'Only PDF files are allowed'}), 400
        file_id = str(uuid.uuid4())

        safe_filename = f"{file_id}_{file.filename}"

        file_path = os.path.join(UPLOAD_FOLDER, safe_filename)
        # Extract text from PDF
        file.save(file_path)

        logger.info(f"File saved successfully at {file_path}")

        # Extract text from PDF
        text = extract_text_from_pdf(file_path)
        if not text.strip():
            logger.warning("No text could be extracted from PDF")
            return jsonify({'error': 'Could not extract text from PDF'}), 400

        # Create Haystack document
        client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

        completion = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": "You are a helpful assistant that extracts data from files content."
            },
            {
                "role": "user",
                "content": text[:2000]
            }
        ],
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "datei_metadaten",
                "schema": {
                    "type": "object",
                    "strict": True,
                    "properties": {
                    "dateiname": {
                "type": "string",
                "description": "Der empfohlene Dateiname basierend auf dem Inhalt des Dokuments."
            },
            "inhalt": {
                "type": "string",
                "description": "Zusammengefasster Dokumentinhalt. Also detailliert, aber nicht zu detailliert."
            },
            "kategorie": {
                "type": "string",
                "description": "Die Kategorie des Dokuments, wie Rechnungen, Verträge, Berichte, Sonstiges."
            }
            },
            "required": [
                        "dateiname",
                        "inhalt",
                        "kategorie"
                    ],
                    "additionalProperties": False
                }
        
            }
        },
        temperature=1,
        max_tokens=9048,
        top_p=1,
        frequency_penalty=0,
        presence_penalty=0
        )
        print("completion: ", completion.choices[0].message.content)
        completion_json = json.loads(completion.choices[0].message.content)
        doc = Document(
            content=completion_json.get("inhalt"),
            meta={
                "name": completion_json.get("dateiname"),
                "path": file_path,
                "suggested_folder": completion_json.get("kategorie")
            }
        )

        """        # Process document with Haystack
        splitter = DocumentSplitter(
            split_by="word",
            split_length=200,
            split_overlap=20
        )"""
        
        if not os.path.exists(os.path.join(UPLOAD_FOLDER, completion_json.get("kategorie"))):
            os.makedirs(os.path.join(UPLOAD_FOLDER, completion_json.get("kategorie")))
        # Generate unique filename
        file_path = os.path.join(os.path.join(UPLOAD_FOLDER, completion_json.get("kategorie")), completion_json.get("dateiname"))
        
        # Save the file
        os.rename(os.path.join(UPLOAD_FOLDER, safe_filename), file_path)
        # Use run instead of process for DocumentSplitter
        # Store in Elasticsearch
        documents=[doc]
        documents_with_embeddings = document_embedder.run(documents)

        document_store.write_documents(documents_with_embeddings.get("documents"), policy=DuplicatePolicy.SKIP)
        logger.info("Document successfully processed and stored")
        print(document_store.count_documents())
        return jsonify({
            'id': file_id,
            'suggestedFolder': completion_json.get("kategorie"),
            'content': completion_json.get("inhalt"),
            'message': 'File successfully processed'
        })

    except Exception as e:
        logger.error(f"Error processing upload: {str(e)}")
        return jsonify({
            'error': 'Error processing PDF',
            'details': str(e)
        }), 500

@app.route('/search', methods=['GET'])
def search():
    try:
        query = request.args.get('query', '').strip()
        print(query)
        if not query:
            return jsonify([])

        logger.info(f"Processing search query: {query}")
        
        results = query_pipeline.run({"text_embedder": {"text": query}})
        print(results)

        response =[ {
            'id': str(uuid.uuid4()),
            'name': doc.meta.get('name', 'Unknown'),
            'suggestedFolder': doc.meta.get('suggested_folder', 'Sonstiges'),
            'path': doc.meta.get('path', ''),
            'content': doc.content[:200],
            'dateAdded': datetime.now().isoformat()
        } for doc in results["retriever"]["documents"]]

        logger.info(f"Found {len(response)} results")
        return jsonify(response)

    except Exception as e:
        logger.error(f"Error processing search: {str(e)}")
        return jsonify({
            'error': 'Error searching documents',
            'details': str(e)
        }), 500

@app.route('/health', methods=['GET'])
def health_check():
    try:
        # Check Elasticsearch connection
        document_store.ping()
        return jsonify({
            'status': 'healthy',
            'elasticsearch': 'connected'
        })
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'error': str(e)
        }), 500

if __name__ == '__main__':
    app.run(port=3000, debug=True)