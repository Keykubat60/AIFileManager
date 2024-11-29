# PDF Organizer Backend

## Setup

1. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Elasticsearch Setup:
   ```bash
   # Pull Elasticsearch image
   docker pull docker.elastic.co/elasticsearch/elasticsearch:8.11.1

   # Start Elasticsearch container
   docker run --name elasticsearch -p 9200:9200 \
     -e "discovery.type=single-node" \
     -e "ES_JAVA_OPTS=-Xms1024m -Xmx1024m" \
     -e "xpack.security.enabled=false" \
     elasticsearch:8.11.1
   ```

3. Optional: Kibana Setup:
   ```bash
   # Start Kibana container
   docker run --name kibana -p 5601:5601 \
     --link elasticsearch:elasticsearch \
     docker.elastic.co/kibana/kibana:8.11.1
   ```

4. Start the Flask server:
   ```bash
   python app.py
   ```

Der Server läuft unter http://localhost:3000

## Entwicklung
```bash
npm run dev
```

## Alternative Setup mit Docker Compose
```bash
docker compose up
```
