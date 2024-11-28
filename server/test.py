from haystack_integrations.document_stores.elasticsearch import ElasticsearchDocumentStore
from haystack import Document

document_store = ElasticsearchDocumentStore(hosts = "http://localhost:9200")
'''document_store.write_documents([
    Document(content="This is first"),
    Document(content="This is second")
    ])'''
print(document_store.count_documents())