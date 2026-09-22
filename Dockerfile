# Single image: builds the React app, folds it into the Spring Boot jar, runs one process.
# Build context must be the repo root:  docker build -t financeiro .

# ---------- 1. Frontend ----------
FROM node:20-alpine AS frontend
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# ---------- 2. Backend (jar with the frontend baked in) ----------
FROM eclipse-temurin:26-jdk-alpine AS backend
WORKDIR /src
COPY backend/.mvn/ backend/.mvn/
COPY backend/mvnw backend/pom.xml backend/
RUN cd backend && chmod +x mvnw && ./mvnw -B -ntp -Dfrontend.skip=true dependency:go-offline
COPY backend/src/ backend/src/
# The npm build already ran in stage 1 — just drop it where the pom expects it.
COPY --from=frontend /frontend/dist/ frontend/dist/
RUN cd backend && ./mvnw -B -ntp clean package -DskipTests \
      -Dfrontend.skip=true -Dfrontend.copy.skip=false

# ---------- 3. Runtime ----------
FROM eclipse-temurin:26-jre-alpine
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY --from=backend /src/backend/target/casal-financeiro-0.0.1-SNAPSHOT.jar app.jar
USER app
EXPOSE 8080
ENV JAVA_OPTS=""
# Most PaaS providers set $PORT; Spring reads it via server.port=${PORT:8080}
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
