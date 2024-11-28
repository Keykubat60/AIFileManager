import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Pipeline } from 'haystack';
import { ElasticsearchDocumentStore } from 'haystack_integrations.document_stores.elasticsearch';
import { ElasticsearchBM25Retriever } from 'haystack_integrations.components.retrievers.elasticsearch';
import { DocumentSplitter } from 'haystack.components.preprocessors';
import * as pdfjs from 'pdfjs-dist';

const __dirname = dirname(fileURLToPath(import.meta.url));
const upload = multer({ dest: 'uploads/' });
const app = express();

app.use(cors());
app.use(express.json());

// Initialize Haystack components
const documentStore = new ElasticsearchDocumentStore({
  hosts: ["http://localhost:9200"],
  index: "documents"
});

const retriever = new ElasticsearchBM25Retriever({
  document_store: documentStore
});

const searchPipeline = new Pipeline();
searchPipeline.add_component("retriever", retriever);

// Extract text from PDF
async function extractTextFromPDF(pdfPath) {
  const data = await pdfjs.getDocument(pdfPath).promise;
  let text = '';
  
  for (let i = 1; i <= data.numPages; i++) {
    const page = await data.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map(item => item.str).join(' ') + '\n';
  }
  
  return text;
}

// Suggest folder based on content
function suggestFolder(content) {
  const lowerContent = content.toLowerCase();
  if (lowerContent.includes('rechnung')) {
    return 'Rechnungen';
  } else if (lowerContent.includes('vertrag')) {
    return 'Verträge';
  } else if (lowerContent.includes('bericht')) {
    return 'Berichte';
  }
  return 'Sonstiges';
}

app.post('/upload', upload.single('pdf'), async (req, res) => {
  try {
    const pdfPath = req.file.path;
    const text = await extractTextFromPDF(pdfPath);
    const suggestedFolder = suggestFolder(text);
    
    // Process document with Haystack
    const splitter = new DocumentSplitter({
      split_by: 'word',
      split_length: 200,
      split_overlap: 20
    });
    
    const doc = { content: text, meta: { name: req.file.originalname, path: pdfPath } };
    const processedDocs = await splitter.process([doc]);
    
    // Store in Elasticsearch
    await documentStore.write_documents(processedDocs);
    
    res.json({
      id: req.file.filename,
      suggestedFolder,
      content: text.substring(0, 200) // Send preview of content
    });
  } catch (error) {
    console.error('Error processing PDF:', error);
    res.status(500).json({ error: 'Error processing PDF' });
  }
});

app.get('/search', async (req, res) => {
  try {
    const { query } = req.query;
    const results = await searchPipeline.run({
      retriever: { query }
    });
    
    res.json(results.documents.map(doc => ({
      id: doc.id,
      name: doc.meta.name,
      suggestedFolder: suggestFolder(doc.content),
      content: doc.content.substring(0, 200),
      dateAdded: new Date()
    })));
  } catch (error) {
    console.error('Error searching documents:', error);
    res.status(500).json({ error: 'Error searching documents' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});