# RiskShield AI — Application Dockerfile
# Includes both Node.js (for Next.js) and Python (for the ML anomaly model),
# since the app shells out to a short-lived Python process for live scoring.
FROM node:20-slim

RUN apt-get update -qq \
  && apt-get install -y --no-install-recommends python3 python3-pip python3-venv \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY ml/requirements.txt ./ml/requirements.txt
RUN pip3 install --break-system-packages --no-cache-dir -r ml/requirements.txt

COPY . .

RUN npx prisma generate
RUN npm run build

# Generate the synthetic dataset and train the ML model at image build time so
# the container is ready to seed and serve immediately.
RUN python3 ml/training/generate_dataset.py && python3 ml/training/train_model.py

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && npm start -- -p ${PORT:-3000}"]
