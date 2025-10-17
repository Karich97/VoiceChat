plugins {
    kotlin("jvm") version "1.9.10"
    id("org.springframework.boot") version "3.3.4"
    id("io.spring.dependency-management") version "1.1.3"
}

group = "ru.karich"
version = "1.0.0"
java.sourceCompatibility = JavaVersion.VERSION_17

repositories {
    mavenCentral()
}

dependencies {
    // Spring Boot
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-websocket")

    // Kotlin
    implementation("org.jetbrains.kotlin:kotlin-reflect")
    implementation("org.jetbrains.kotlin:kotlin-stdlib-jdk8")

    // Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.9.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-jdk8:1.9.0")

    // Test
    testImplementation("org.springframework.boot:spring-boot-starter-test")

    // Spring Boot Actuator для метрик
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("io.micrometer:micrometer-registry-prometheus")

    // Micrometer (по желанию, для более гибких метрик)
    implementation("io.micrometer:micrometer-core")
    implementation("io.micrometer:micrometer-registry-prometheus")
}

tasks.withType<org.jetbrains.kotlin.gradle.tasks.KotlinCompile> {
    kotlinOptions {
        jvmTarget = "17"
    }
}

tasks.withType<Test> {
    useJUnitPlatform()
}

// Для Spring Boot fat JAR
tasks.getByName<org.springframework.boot.gradle.tasks.bundling.BootJar>("bootJar") {
    mainClass.set("ru.karich.VoiceChatApplicationKt")
}
