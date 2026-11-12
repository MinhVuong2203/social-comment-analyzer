# ---- Build ----
FROM maven:3.9-eclipse-temurin-25 AS build
WORKDIR /app

# Tải dependency trước để tận dụng cache khi chỉ sửa code
COPY pom.xml .
RUN mvn -B dependency:go-offline

COPY src ./src
# Test đã chạy ở bước TEST của pipeline nên bỏ qua khi build image
RUN mvn -B package -DskipTests

# ---- Run ----
FROM eclipse-temurin:25-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]