-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: hello_db
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Current Database: `hello_db`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `hello_db` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */;

USE `hello_db`;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `audit_logs` (
  `id` varchar(64) NOT NULL,
  `actor_user_id` varchar(64) DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `entity_name` varchar(100) NOT NULL,
  `entity_id` varchar(64) NOT NULL,
  `payload_before` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload_before`)),
  `payload_after` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload_after`)),
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_audit_entity` (`entity_name`,`entity_id`),
  KEY `idx_audit_actor` (`actor_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_logs`
--

LOCK TABLES `audit_logs` WRITE;
/*!40000 ALTER TABLE `audit_logs` DISABLE KEYS */;
INSERT INTO `audit_logs` VALUES ('audit-1','user-admin-1','KYC_APPROVED','businesses','biz-siri-dental','{\"status\":\"UNDER_REVIEW\"}','{\"status\":\"APPROVED\",\"is_verified\":1}','127.0.0.1','2026-11-02 12:54:09'),('audit-2','user-admin-1','KYC_APPROVED','businesses','biz-amravati','{\"status\":\"UNDER_REVIEW\"}','{\"status\":\"APPROVED\",\"is_verified\":1}','127.0.0.1','2026-11-02 12:54:09'),('audit-3','user-admin-1','LOCALITY_CREATED','localities','loc-nahamar',NULL,'{\"name\":\"Nahamar\",\"cityName\":\"Vijayawada\"}','127.0.0.1','2026-11-02 12:54:09');
/*!40000 ALTER TABLE `audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `business_categories`
--

DROP TABLE IF EXISTS `business_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `business_categories` (
  `id` varchar(64) NOT NULL,
  `business_id` varchar(64) NOT NULL,
  `category_id` varchar(64) NOT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_biz_cat` (`business_id`,`category_id`),
  KEY `idx_bcat_cat` (`category_id`),
  CONSTRAINT `fk_bcat_biz` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_bcat_cat` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `business_categories`
--

LOCK TABLES `business_categories` WRITE;
/*!40000 ALTER TABLE `business_categories` DISABLE KEYS */;
INSERT INTO `business_categories` VALUES ('bcat_1793601878187','biz_1793601878173_6t09','cat-restaurants',1),('bcat_1793601887844','biz_1793601887809_ksbc','cat-dentists',1),('bcat_1793605138296','biz_1793605138282_2xvk','cat-restaurants',1),('bcat_biz_ask-astro_1_cat-ask-astro','biz_ask-astro_1','cat-ask-astro',1),('bcat_biz_ask-astro_2_cat-ask-astro','biz_ask-astro_2','cat-ask-astro',1),('bcat_biz_ask-astro_3_cat-ask-astro','biz_ask-astro_3','cat-ask-astro',1),('bcat_biz_beauty-spa_2_cat-beauty-spa','biz_beauty-spa_2','cat-beauty-spa',1),('bcat_biz_beauty-spa_3_cat-beauty-spa','biz_beauty-spa_3','cat-beauty-spa',1),('bcat_biz_contractors_1_cat-contractors','biz_contractors_1','cat-contractors',1),('bcat_biz_contractors_2_cat-contractors','biz_contractors_2','cat-contractors',1),('bcat_biz_contractors_3_cat-contractors','biz_contractors_3','cat-contractors',1),('bcat_biz_dentists_1_cat-dentists','biz_dentists_1','cat-dentists',1),('bcat_biz_dentists_2_cat-dentists','biz_dentists_2','cat-dentists',1),('bcat_biz_dentists_3_cat-dentists','biz_dentists_3','cat-dentists',1),('bcat_biz_education_1_cat-education','biz_education_1','cat-education',1),('bcat_biz_education_2_cat-education','biz_education_2','cat-education',1),('bcat_biz_education_3_cat-education','biz_education_3','cat-education',1),('bcat_biz_estate-agent_1_cat-estate-agent','biz_estate-agent_1','cat-estate-agent',1),('bcat_biz_estate-agent_2_cat-estate-agent','biz_estate-agent_2','cat-estate-agent',1),('bcat_biz_estate-agent_3_cat-estate-agent','biz_estate-agent_3','cat-estate-agent',1),('bcat_biz_home-decor_2_cat-home-decor','biz_home-decor_2','cat-home-decor',1),('bcat_biz_home-decor_3_cat-home-decor','biz_home-decor_3','cat-home-decor',1),('bcat_biz_hospitals_1_cat-hospitals','biz_hospitals_1','cat-hospitals',1),('bcat_biz_hospitals_2_cat-hospitals','biz_hospitals_2','cat-hospitals',1),('bcat_biz_hospitals_3_cat-hospitals','biz_hospitals_3','cat-hospitals',1),('bcat_biz_hotels_2_cat-hotels','biz_hotels_2','cat-hotels',1),('bcat_biz_hotels_3_cat-hotels','biz_hotels_3','cat-hotels',1),('bcat_biz_pet-shops_1_cat-pet-shops','biz_pet-shops_1','cat-pet-shops',1),('bcat_biz_pet-shops_2_cat-pet-shops','biz_pet-shops_2','cat-pet-shops',1),('bcat_biz_pet-shops_3_cat-pet-shops','biz_pet-shops_3','cat-pet-shops',1),('bcat_biz_pg-hostels_1_cat-pg-hostels','biz_pg-hostels_1','cat-pg-hostels',1),('bcat_biz_pg-hostels_2_cat-pg-hostels','biz_pg-hostels_2','cat-pg-hostels',1),('bcat_biz_pg-hostels_3_cat-pg-hostels','biz_pg-hostels_3','cat-pg-hostels',1),('bcat_biz_rent-hire_1_cat-rent-hire','biz_rent-hire_1','cat-rent-hire',1),('bcat_biz_rent-hire_2_cat-rent-hire','biz_rent-hire_2','cat-rent-hire',1),('bcat_biz_rent-hire_3_cat-rent-hire','biz_rent-hire_3','cat-rent-hire',1),('bcat_biz_restaurants_1_cat-restaurants','biz_restaurants_1','cat-restaurants',1),('bcat_biz_restaurants_2_cat-restaurants','biz_restaurants_2','cat-restaurants',1),('bcat_biz_restaurants_3_cat-restaurants','biz_restaurants_3','cat-restaurants',1),('bcat_biz_wedding-planning_1_cat-wedding-planning','biz_wedding-planning_1','cat-wedding-planning',1),('bcat_biz_wedding-planning_2_cat-wedding-planning','biz_wedding-planning_2','cat-wedding-planning',1),('bcat_biz_wedding-planning_3_cat-wedding-planning','biz_wedding-planning_3','cat-wedding-planning',1),('bcat-10','biz-gayatri-astro','cat-ask-astro',1),('bcat-11','biz-siddhi-weddings','cat-wedding-planning',1),('bcat-12','biz-narayana-academy','cat-education',1),('bcat-13','biz-apex-rentals','cat-rent-hire',1),('bcat-14','biz-ayush-hospital','cat-hospitals',1),('bcat-15','biz-amaravati-builders','cat-contractors',1),('bcat-16','biz-tail-waggers','cat-pet-shops',1),('bcat-17','biz-sai-pg','cat-pg-hostels',1),('bcat-18','biz-capital-estate','cat-estate-agent',1),('bcat-1b','biz-amravati','cat-restaurants',0),('bcat-2b','biz-siri-dental','cat-doctors',0),('bcat-2c','biz-siri-dental','cat-dentists',0),('bcat-3b','biz-fernat-dental','cat-dentists',0),('bcat-4b','biz-srinivasa-packers','cat-home',0),('bcat-4c','biz-srinivasa-packers','cat-rent-hire',0),('bcat-5','biz-sri-lakshmi','cat-electric',1),('bcat-5b','biz-sri-lakshmi','cat-home',0),('bcat-5c','biz-sri-lakshmi','cat-contractors',0),('bcat-6','biz-balaji-tours','cat-tours',1),('bcat-6b','biz-balaji-tours','cat-rent-hire',0),('bcat-7','biz-novotel-vja','cat-hotels',1),('bcat-8','biz-lotus-spa','cat-beauty-spa',1),('bcat-9','biz-urban-decor','cat-home-decor',1),('bcat-amravati','biz-amravati','cat-food',1),('bcat-bawarchi','biz-bawarchi-royal','cat-food',1),('bcat-fernat','biz-fernat-dental','cat-dental',1),('bcat-siri','biz-siri-dental','cat-dental',1),('bcat-srinivasa','biz-srinivasa-packers','cat-movers',1);
/*!40000 ALTER TABLE `business_categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `business_hours`
--

DROP TABLE IF EXISTS `business_hours`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `business_hours` (
  `id` varchar(64) NOT NULL,
  `business_id` varchar(64) NOT NULL,
  `day_of_week` tinyint(4) NOT NULL COMMENT '0=Sun, 1=Mon, ..., 6=Sat',
  `opens_at` time DEFAULT NULL,
  `closes_at` time DEFAULT NULL,
  `is_closed` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_biz_day` (`business_id`,`day_of_week`),
  CONSTRAINT `fk_bhours_biz` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `business_hours`
--

LOCK TABLES `business_hours` WRITE;
/*!40000 ALTER TABLE `business_hours` DISABLE KEYS */;
INSERT INTO `business_hours` VALUES ('bhour_biz_ask-astro_1_0','biz_ask-astro_1',0,'09:00:00','21:00:00',0),('bhour_biz_ask-astro_1_1','biz_ask-astro_1',1,'09:00:00','21:00:00',0),('bhour_biz_ask-astro_1_2','biz_ask-astro_1',2,'09:00:00','21:00:00',0),('bhour_biz_ask-astro_1_3','biz_ask-astro_1',3,'09:00:00','21:00:00',0),('bhour_biz_ask-astro_1_4','biz_ask-astro_1',4,'09:00:00','21:00:00',0),('bhour_biz_ask-astro_1_5','biz_ask-astro_1',5,'09:00:00','21:00:00',0),('bhour_biz_ask-astro_1_6','biz_ask-astro_1',6,'09:00:00','21:00:00',0),('bhour_biz_ask-astro_2_0','biz_ask-astro_2',0,'09:00:00','21:00:00',0),('bhour_biz_ask-astro_2_1','biz_ask-astro_2',1,'09:00:00','21:00:00',0),('bhour_biz_ask-astro_2_2','biz_ask-astro_2',2,'09:00:00','21:00:00',0),('bhour_biz_ask-astro_2_3','biz_ask-astro_2',3,'09:00:00','21:00:00',0),('bhour_biz_ask-astro_2_4','biz_ask-astro_2',4,'09:00:00','21:00:00',0),('bhour_biz_ask-astro_2_5','biz_ask-astro_2',5,'09:00:00','21:00:00',0),('bhour_biz_ask-astro_2_6','biz_ask-astro_2',6,'09:00:00','21:00:00',0),('bhour_biz_ask-astro_3_0','biz_ask-astro_3',0,'09:00:00','21:00:00',0),('bhour_biz_ask-astro_3_1','biz_ask-astro_3',1,'09:00:00','21:00:00',0),('bhour_biz_ask-astro_3_2','biz_ask-astro_3',2,'09:00:00','21:00:00',0),('bhour_biz_ask-astro_3_3','biz_ask-astro_3',3,'09:00:00','21:00:00',0),('bhour_biz_ask-astro_3_4','biz_ask-astro_3',4,'09:00:00','21:00:00',0),('bhour_biz_ask-astro_3_5','biz_ask-astro_3',5,'09:00:00','21:00:00',0),('bhour_biz_ask-astro_3_6','biz_ask-astro_3',6,'09:00:00','21:00:00',0),('bhour_biz_beauty-spa_2_0','biz_beauty-spa_2',0,'09:00:00','21:00:00',0),('bhour_biz_beauty-spa_2_1','biz_beauty-spa_2',1,'09:00:00','21:00:00',0),('bhour_biz_beauty-spa_2_2','biz_beauty-spa_2',2,'09:00:00','21:00:00',0),('bhour_biz_beauty-spa_2_3','biz_beauty-spa_2',3,'09:00:00','21:00:00',0),('bhour_biz_beauty-spa_2_4','biz_beauty-spa_2',4,'09:00:00','21:00:00',0),('bhour_biz_beauty-spa_2_5','biz_beauty-spa_2',5,'09:00:00','21:00:00',0),('bhour_biz_beauty-spa_2_6','biz_beauty-spa_2',6,'09:00:00','21:00:00',0),('bhour_biz_beauty-spa_3_0','biz_beauty-spa_3',0,'09:00:00','21:00:00',0),('bhour_biz_beauty-spa_3_1','biz_beauty-spa_3',1,'09:00:00','21:00:00',0),('bhour_biz_beauty-spa_3_2','biz_beauty-spa_3',2,'09:00:00','21:00:00',0),('bhour_biz_beauty-spa_3_3','biz_beauty-spa_3',3,'09:00:00','21:00:00',0),('bhour_biz_beauty-spa_3_4','biz_beauty-spa_3',4,'09:00:00','21:00:00',0),('bhour_biz_beauty-spa_3_5','biz_beauty-spa_3',5,'09:00:00','21:00:00',0),('bhour_biz_beauty-spa_3_6','biz_beauty-spa_3',6,'09:00:00','21:00:00',0),('bhour_biz_contractors_1_0','biz_contractors_1',0,'09:00:00','21:00:00',0),('bhour_biz_contractors_1_1','biz_contractors_1',1,'09:00:00','21:00:00',0),('bhour_biz_contractors_1_2','biz_contractors_1',2,'09:00:00','21:00:00',0),('bhour_biz_contractors_1_3','biz_contractors_1',3,'09:00:00','21:00:00',0),('bhour_biz_contractors_1_4','biz_contractors_1',4,'09:00:00','21:00:00',0),('bhour_biz_contractors_1_5','biz_contractors_1',5,'09:00:00','21:00:00',0),('bhour_biz_contractors_1_6','biz_contractors_1',6,'09:00:00','21:00:00',0),('bhour_biz_contractors_2_0','biz_contractors_2',0,'09:00:00','21:00:00',0),('bhour_biz_contractors_2_1','biz_contractors_2',1,'09:00:00','21:00:00',0),('bhour_biz_contractors_2_2','biz_contractors_2',2,'09:00:00','21:00:00',0),('bhour_biz_contractors_2_3','biz_contractors_2',3,'09:00:00','21:00:00',0),('bhour_biz_contractors_2_4','biz_contractors_2',4,'09:00:00','21:00:00',0),('bhour_biz_contractors_2_5','biz_contractors_2',5,'09:00:00','21:00:00',0),('bhour_biz_contractors_2_6','biz_contractors_2',6,'09:00:00','21:00:00',0),('bhour_biz_contractors_3_0','biz_contractors_3',0,'09:00:00','21:00:00',0),('bhour_biz_contractors_3_1','biz_contractors_3',1,'09:00:00','21:00:00',0),('bhour_biz_contractors_3_2','biz_contractors_3',2,'09:00:00','21:00:00',0),('bhour_biz_contractors_3_3','biz_contractors_3',3,'09:00:00','21:00:00',0),('bhour_biz_contractors_3_4','biz_contractors_3',4,'09:00:00','21:00:00',0),('bhour_biz_contractors_3_5','biz_contractors_3',5,'09:00:00','21:00:00',0),('bhour_biz_contractors_3_6','biz_contractors_3',6,'09:00:00','21:00:00',0),('bhour_biz_dentists_1_0','biz_dentists_1',0,'09:00:00','21:00:00',0),('bhour_biz_dentists_1_1','biz_dentists_1',1,'09:00:00','21:00:00',0),('bhour_biz_dentists_1_2','biz_dentists_1',2,'09:00:00','21:00:00',0),('bhour_biz_dentists_1_3','biz_dentists_1',3,'09:00:00','21:00:00',0),('bhour_biz_dentists_1_4','biz_dentists_1',4,'09:00:00','21:00:00',0),('bhour_biz_dentists_1_5','biz_dentists_1',5,'09:00:00','21:00:00',0),('bhour_biz_dentists_1_6','biz_dentists_1',6,'09:00:00','21:00:00',0),('bhour_biz_dentists_2_0','biz_dentists_2',0,'09:00:00','21:00:00',0),('bhour_biz_dentists_2_1','biz_dentists_2',1,'09:00:00','21:00:00',0),('bhour_biz_dentists_2_2','biz_dentists_2',2,'09:00:00','21:00:00',0),('bhour_biz_dentists_2_3','biz_dentists_2',3,'09:00:00','21:00:00',0),('bhour_biz_dentists_2_4','biz_dentists_2',4,'09:00:00','21:00:00',0),('bhour_biz_dentists_2_5','biz_dentists_2',5,'09:00:00','21:00:00',0),('bhour_biz_dentists_2_6','biz_dentists_2',6,'09:00:00','21:00:00',0),('bhour_biz_dentists_3_0','biz_dentists_3',0,'09:00:00','21:00:00',0),('bhour_biz_dentists_3_1','biz_dentists_3',1,'09:00:00','21:00:00',0),('bhour_biz_dentists_3_2','biz_dentists_3',2,'09:00:00','21:00:00',0),('bhour_biz_dentists_3_3','biz_dentists_3',3,'09:00:00','21:00:00',0),('bhour_biz_dentists_3_4','biz_dentists_3',4,'09:00:00','21:00:00',0),('bhour_biz_dentists_3_5','biz_dentists_3',5,'09:00:00','21:00:00',0),('bhour_biz_dentists_3_6','biz_dentists_3',6,'09:00:00','21:00:00',0),('bhour_biz_education_1_0','biz_education_1',0,'09:00:00','21:00:00',0),('bhour_biz_education_1_1','biz_education_1',1,'09:00:00','21:00:00',0),('bhour_biz_education_1_2','biz_education_1',2,'09:00:00','21:00:00',0),('bhour_biz_education_1_3','biz_education_1',3,'09:00:00','21:00:00',0),('bhour_biz_education_1_4','biz_education_1',4,'09:00:00','21:00:00',0),('bhour_biz_education_1_5','biz_education_1',5,'09:00:00','21:00:00',0),('bhour_biz_education_1_6','biz_education_1',6,'09:00:00','21:00:00',0),('bhour_biz_education_2_0','biz_education_2',0,'09:00:00','21:00:00',0),('bhour_biz_education_2_1','biz_education_2',1,'09:00:00','21:00:00',0),('bhour_biz_education_2_2','biz_education_2',2,'09:00:00','21:00:00',0),('bhour_biz_education_2_3','biz_education_2',3,'09:00:00','21:00:00',0),('bhour_biz_education_2_4','biz_education_2',4,'09:00:00','21:00:00',0),('bhour_biz_education_2_5','biz_education_2',5,'09:00:00','21:00:00',0),('bhour_biz_education_2_6','biz_education_2',6,'09:00:00','21:00:00',0),('bhour_biz_education_3_0','biz_education_3',0,'09:00:00','21:00:00',0),('bhour_biz_education_3_1','biz_education_3',1,'09:00:00','21:00:00',0),('bhour_biz_education_3_2','biz_education_3',2,'09:00:00','21:00:00',0),('bhour_biz_education_3_3','biz_education_3',3,'09:00:00','21:00:00',0),('bhour_biz_education_3_4','biz_education_3',4,'09:00:00','21:00:00',0),('bhour_biz_education_3_5','biz_education_3',5,'09:00:00','21:00:00',0),('bhour_biz_education_3_6','biz_education_3',6,'09:00:00','21:00:00',0),('bhour_biz_estate-agent_1_0','biz_estate-agent_1',0,'09:00:00','21:00:00',0),('bhour_biz_estate-agent_1_1','biz_estate-agent_1',1,'09:00:00','21:00:00',0),('bhour_biz_estate-agent_1_2','biz_estate-agent_1',2,'09:00:00','21:00:00',0),('bhour_biz_estate-agent_1_3','biz_estate-agent_1',3,'09:00:00','21:00:00',0),('bhour_biz_estate-agent_1_4','biz_estate-agent_1',4,'09:00:00','21:00:00',0),('bhour_biz_estate-agent_1_5','biz_estate-agent_1',5,'09:00:00','21:00:00',0),('bhour_biz_estate-agent_1_6','biz_estate-agent_1',6,'09:00:00','21:00:00',0),('bhour_biz_estate-agent_2_0','biz_estate-agent_2',0,'09:00:00','21:00:00',0),('bhour_biz_estate-agent_2_1','biz_estate-agent_2',1,'09:00:00','21:00:00',0),('bhour_biz_estate-agent_2_2','biz_estate-agent_2',2,'09:00:00','21:00:00',0),('bhour_biz_estate-agent_2_3','biz_estate-agent_2',3,'09:00:00','21:00:00',0),('bhour_biz_estate-agent_2_4','biz_estate-agent_2',4,'09:00:00','21:00:00',0),('bhour_biz_estate-agent_2_5','biz_estate-agent_2',5,'09:00:00','21:00:00',0),('bhour_biz_estate-agent_2_6','biz_estate-agent_2',6,'09:00:00','21:00:00',0),('bhour_biz_estate-agent_3_0','biz_estate-agent_3',0,'09:00:00','21:00:00',0),('bhour_biz_estate-agent_3_1','biz_estate-agent_3',1,'09:00:00','21:00:00',0),('bhour_biz_estate-agent_3_2','biz_estate-agent_3',2,'09:00:00','21:00:00',0),('bhour_biz_estate-agent_3_3','biz_estate-agent_3',3,'09:00:00','21:00:00',0),('bhour_biz_estate-agent_3_4','biz_estate-agent_3',4,'09:00:00','21:00:00',0),('bhour_biz_estate-agent_3_5','biz_estate-agent_3',5,'09:00:00','21:00:00',0),('bhour_biz_estate-agent_3_6','biz_estate-agent_3',6,'09:00:00','21:00:00',0),('bhour_biz_home-decor_2_0','biz_home-decor_2',0,'09:00:00','21:00:00',0),('bhour_biz_home-decor_2_1','biz_home-decor_2',1,'09:00:00','21:00:00',0),('bhour_biz_home-decor_2_2','biz_home-decor_2',2,'09:00:00','21:00:00',0),('bhour_biz_home-decor_2_3','biz_home-decor_2',3,'09:00:00','21:00:00',0),('bhour_biz_home-decor_2_4','biz_home-decor_2',4,'09:00:00','21:00:00',0),('bhour_biz_home-decor_2_5','biz_home-decor_2',5,'09:00:00','21:00:00',0),('bhour_biz_home-decor_2_6','biz_home-decor_2',6,'09:00:00','21:00:00',0),('bhour_biz_home-decor_3_0','biz_home-decor_3',0,'09:00:00','21:00:00',0),('bhour_biz_home-decor_3_1','biz_home-decor_3',1,'09:00:00','21:00:00',0),('bhour_biz_home-decor_3_2','biz_home-decor_3',2,'09:00:00','21:00:00',0),('bhour_biz_home-decor_3_3','biz_home-decor_3',3,'09:00:00','21:00:00',0),('bhour_biz_home-decor_3_4','biz_home-decor_3',4,'09:00:00','21:00:00',0),('bhour_biz_home-decor_3_5','biz_home-decor_3',5,'09:00:00','21:00:00',0),('bhour_biz_home-decor_3_6','biz_home-decor_3',6,'09:00:00','21:00:00',0),('bhour_biz_hospitals_1_0','biz_hospitals_1',0,'09:00:00','21:00:00',0),('bhour_biz_hospitals_1_1','biz_hospitals_1',1,'09:00:00','21:00:00',0),('bhour_biz_hospitals_1_2','biz_hospitals_1',2,'09:00:00','21:00:00',0),('bhour_biz_hospitals_1_3','biz_hospitals_1',3,'09:00:00','21:00:00',0),('bhour_biz_hospitals_1_4','biz_hospitals_1',4,'09:00:00','21:00:00',0),('bhour_biz_hospitals_1_5','biz_hospitals_1',5,'09:00:00','21:00:00',0),('bhour_biz_hospitals_1_6','biz_hospitals_1',6,'09:00:00','21:00:00',0),('bhour_biz_hospitals_2_0','biz_hospitals_2',0,'09:00:00','21:00:00',0),('bhour_biz_hospitals_2_1','biz_hospitals_2',1,'09:00:00','21:00:00',0),('bhour_biz_hospitals_2_2','biz_hospitals_2',2,'09:00:00','21:00:00',0),('bhour_biz_hospitals_2_3','biz_hospitals_2',3,'09:00:00','21:00:00',0),('bhour_biz_hospitals_2_4','biz_hospitals_2',4,'09:00:00','21:00:00',0),('bhour_biz_hospitals_2_5','biz_hospitals_2',5,'09:00:00','21:00:00',0),('bhour_biz_hospitals_2_6','biz_hospitals_2',6,'09:00:00','21:00:00',0),('bhour_biz_hospitals_3_0','biz_hospitals_3',0,'09:00:00','21:00:00',0),('bhour_biz_hospitals_3_1','biz_hospitals_3',1,'09:00:00','21:00:00',0),('bhour_biz_hospitals_3_2','biz_hospitals_3',2,'09:00:00','21:00:00',0),('bhour_biz_hospitals_3_3','biz_hospitals_3',3,'09:00:00','21:00:00',0),('bhour_biz_hospitals_3_4','biz_hospitals_3',4,'09:00:00','21:00:00',0),('bhour_biz_hospitals_3_5','biz_hospitals_3',5,'09:00:00','21:00:00',0),('bhour_biz_hospitals_3_6','biz_hospitals_3',6,'09:00:00','21:00:00',0),('bhour_biz_hotels_2_0','biz_hotels_2',0,'09:00:00','21:00:00',0),('bhour_biz_hotels_2_1','biz_hotels_2',1,'09:00:00','21:00:00',0),('bhour_biz_hotels_2_2','biz_hotels_2',2,'09:00:00','21:00:00',0),('bhour_biz_hotels_2_3','biz_hotels_2',3,'09:00:00','21:00:00',0),('bhour_biz_hotels_2_4','biz_hotels_2',4,'09:00:00','21:00:00',0),('bhour_biz_hotels_2_5','biz_hotels_2',5,'09:00:00','21:00:00',0),('bhour_biz_hotels_2_6','biz_hotels_2',6,'09:00:00','21:00:00',0),('bhour_biz_hotels_3_0','biz_hotels_3',0,'09:00:00','21:00:00',0),('bhour_biz_hotels_3_1','biz_hotels_3',1,'09:00:00','21:00:00',0),('bhour_biz_hotels_3_2','biz_hotels_3',2,'09:00:00','21:00:00',0),('bhour_biz_hotels_3_3','biz_hotels_3',3,'09:00:00','21:00:00',0),('bhour_biz_hotels_3_4','biz_hotels_3',4,'09:00:00','21:00:00',0),('bhour_biz_hotels_3_5','biz_hotels_3',5,'09:00:00','21:00:00',0),('bhour_biz_hotels_3_6','biz_hotels_3',6,'09:00:00','21:00:00',0),('bhour_biz_pet-shops_1_0','biz_pet-shops_1',0,'09:00:00','21:00:00',0),('bhour_biz_pet-shops_1_1','biz_pet-shops_1',1,'09:00:00','21:00:00',0),('bhour_biz_pet-shops_1_2','biz_pet-shops_1',2,'09:00:00','21:00:00',0),('bhour_biz_pet-shops_1_3','biz_pet-shops_1',3,'09:00:00','21:00:00',0),('bhour_biz_pet-shops_1_4','biz_pet-shops_1',4,'09:00:00','21:00:00',0),('bhour_biz_pet-shops_1_5','biz_pet-shops_1',5,'09:00:00','21:00:00',0),('bhour_biz_pet-shops_1_6','biz_pet-shops_1',6,'09:00:00','21:00:00',0),('bhour_biz_pet-shops_2_0','biz_pet-shops_2',0,'09:00:00','21:00:00',0),('bhour_biz_pet-shops_2_1','biz_pet-shops_2',1,'09:00:00','21:00:00',0),('bhour_biz_pet-shops_2_2','biz_pet-shops_2',2,'09:00:00','21:00:00',0),('bhour_biz_pet-shops_2_3','biz_pet-shops_2',3,'09:00:00','21:00:00',0),('bhour_biz_pet-shops_2_4','biz_pet-shops_2',4,'09:00:00','21:00:00',0),('bhour_biz_pet-shops_2_5','biz_pet-shops_2',5,'09:00:00','21:00:00',0),('bhour_biz_pet-shops_2_6','biz_pet-shops_2',6,'09:00:00','21:00:00',0),('bhour_biz_pet-shops_3_0','biz_pet-shops_3',0,'09:00:00','21:00:00',0),('bhour_biz_pet-shops_3_1','biz_pet-shops_3',1,'09:00:00','21:00:00',0),('bhour_biz_pet-shops_3_2','biz_pet-shops_3',2,'09:00:00','21:00:00',0),('bhour_biz_pet-shops_3_3','biz_pet-shops_3',3,'09:00:00','21:00:00',0),('bhour_biz_pet-shops_3_4','biz_pet-shops_3',4,'09:00:00','21:00:00',0),('bhour_biz_pet-shops_3_5','biz_pet-shops_3',5,'09:00:00','21:00:00',0),('bhour_biz_pet-shops_3_6','biz_pet-shops_3',6,'09:00:00','21:00:00',0),('bhour_biz_pg-hostels_1_0','biz_pg-hostels_1',0,'09:00:00','21:00:00',0),('bhour_biz_pg-hostels_1_1','biz_pg-hostels_1',1,'09:00:00','21:00:00',0),('bhour_biz_pg-hostels_1_2','biz_pg-hostels_1',2,'09:00:00','21:00:00',0),('bhour_biz_pg-hostels_1_3','biz_pg-hostels_1',3,'09:00:00','21:00:00',0),('bhour_biz_pg-hostels_1_4','biz_pg-hostels_1',4,'09:00:00','21:00:00',0),('bhour_biz_pg-hostels_1_5','biz_pg-hostels_1',5,'09:00:00','21:00:00',0),('bhour_biz_pg-hostels_1_6','biz_pg-hostels_1',6,'09:00:00','21:00:00',0),('bhour_biz_pg-hostels_2_0','biz_pg-hostels_2',0,'09:00:00','21:00:00',0),('bhour_biz_pg-hostels_2_1','biz_pg-hostels_2',1,'09:00:00','21:00:00',0),('bhour_biz_pg-hostels_2_2','biz_pg-hostels_2',2,'09:00:00','21:00:00',0),('bhour_biz_pg-hostels_2_3','biz_pg-hostels_2',3,'09:00:00','21:00:00',0),('bhour_biz_pg-hostels_2_4','biz_pg-hostels_2',4,'09:00:00','21:00:00',0),('bhour_biz_pg-hostels_2_5','biz_pg-hostels_2',5,'09:00:00','21:00:00',0),('bhour_biz_pg-hostels_2_6','biz_pg-hostels_2',6,'09:00:00','21:00:00',0),('bhour_biz_pg-hostels_3_0','biz_pg-hostels_3',0,'09:00:00','21:00:00',0),('bhour_biz_pg-hostels_3_1','biz_pg-hostels_3',1,'09:00:00','21:00:00',0),('bhour_biz_pg-hostels_3_2','biz_pg-hostels_3',2,'09:00:00','21:00:00',0),('bhour_biz_pg-hostels_3_3','biz_pg-hostels_3',3,'09:00:00','21:00:00',0),('bhour_biz_pg-hostels_3_4','biz_pg-hostels_3',4,'09:00:00','21:00:00',0),('bhour_biz_pg-hostels_3_5','biz_pg-hostels_3',5,'09:00:00','21:00:00',0),('bhour_biz_pg-hostels_3_6','biz_pg-hostels_3',6,'09:00:00','21:00:00',0),('bhour_biz_rent-hire_1_0','biz_rent-hire_1',0,'09:00:00','21:00:00',0),('bhour_biz_rent-hire_1_1','biz_rent-hire_1',1,'09:00:00','21:00:00',0),('bhour_biz_rent-hire_1_2','biz_rent-hire_1',2,'09:00:00','21:00:00',0),('bhour_biz_rent-hire_1_3','biz_rent-hire_1',3,'09:00:00','21:00:00',0),('bhour_biz_rent-hire_1_4','biz_rent-hire_1',4,'09:00:00','21:00:00',0),('bhour_biz_rent-hire_1_5','biz_rent-hire_1',5,'09:00:00','21:00:00',0),('bhour_biz_rent-hire_1_6','biz_rent-hire_1',6,'09:00:00','21:00:00',0),('bhour_biz_rent-hire_2_0','biz_rent-hire_2',0,'09:00:00','21:00:00',0),('bhour_biz_rent-hire_2_1','biz_rent-hire_2',1,'09:00:00','21:00:00',0),('bhour_biz_rent-hire_2_2','biz_rent-hire_2',2,'09:00:00','21:00:00',0),('bhour_biz_rent-hire_2_3','biz_rent-hire_2',3,'09:00:00','21:00:00',0),('bhour_biz_rent-hire_2_4','biz_rent-hire_2',4,'09:00:00','21:00:00',0),('bhour_biz_rent-hire_2_5','biz_rent-hire_2',5,'09:00:00','21:00:00',0),('bhour_biz_rent-hire_2_6','biz_rent-hire_2',6,'09:00:00','21:00:00',0),('bhour_biz_rent-hire_3_0','biz_rent-hire_3',0,'09:00:00','21:00:00',0),('bhour_biz_rent-hire_3_1','biz_rent-hire_3',1,'09:00:00','21:00:00',0),('bhour_biz_rent-hire_3_2','biz_rent-hire_3',2,'09:00:00','21:00:00',0),('bhour_biz_rent-hire_3_3','biz_rent-hire_3',3,'09:00:00','21:00:00',0),('bhour_biz_rent-hire_3_4','biz_rent-hire_3',4,'09:00:00','21:00:00',0),('bhour_biz_rent-hire_3_5','biz_rent-hire_3',5,'09:00:00','21:00:00',0),('bhour_biz_rent-hire_3_6','biz_rent-hire_3',6,'09:00:00','21:00:00',0),('bhour_biz_restaurants_1_0','biz_restaurants_1',0,'09:00:00','21:00:00',0),('bhour_biz_restaurants_1_1','biz_restaurants_1',1,'09:00:00','21:00:00',0),('bhour_biz_restaurants_1_2','biz_restaurants_1',2,'09:00:00','21:00:00',0),('bhour_biz_restaurants_1_3','biz_restaurants_1',3,'09:00:00','21:00:00',0),('bhour_biz_restaurants_1_4','biz_restaurants_1',4,'09:00:00','21:00:00',0),('bhour_biz_restaurants_1_5','biz_restaurants_1',5,'09:00:00','21:00:00',0),('bhour_biz_restaurants_1_6','biz_restaurants_1',6,'09:00:00','21:00:00',0),('bhour_biz_restaurants_2_0','biz_restaurants_2',0,'09:00:00','21:00:00',0),('bhour_biz_restaurants_2_1','biz_restaurants_2',1,'09:00:00','21:00:00',0),('bhour_biz_restaurants_2_2','biz_restaurants_2',2,'09:00:00','21:00:00',0),('bhour_biz_restaurants_2_3','biz_restaurants_2',3,'09:00:00','21:00:00',0),('bhour_biz_restaurants_2_4','biz_restaurants_2',4,'09:00:00','21:00:00',0),('bhour_biz_restaurants_2_5','biz_restaurants_2',5,'09:00:00','21:00:00',0),('bhour_biz_restaurants_2_6','biz_restaurants_2',6,'09:00:00','21:00:00',0),('bhour_biz_restaurants_3_0','biz_restaurants_3',0,'09:00:00','21:00:00',0),('bhour_biz_restaurants_3_1','biz_restaurants_3',1,'09:00:00','21:00:00',0),('bhour_biz_restaurants_3_2','biz_restaurants_3',2,'09:00:00','21:00:00',0),('bhour_biz_restaurants_3_3','biz_restaurants_3',3,'09:00:00','21:00:00',0),('bhour_biz_restaurants_3_4','biz_restaurants_3',4,'09:00:00','21:00:00',0),('bhour_biz_restaurants_3_5','biz_restaurants_3',5,'09:00:00','21:00:00',0),('bhour_biz_restaurants_3_6','biz_restaurants_3',6,'09:00:00','21:00:00',0),('bhour_biz_wedding-planning_1_0','biz_wedding-planning_1',0,'09:00:00','21:00:00',0),('bhour_biz_wedding-planning_1_1','biz_wedding-planning_1',1,'09:00:00','21:00:00',0),('bhour_biz_wedding-planning_1_2','biz_wedding-planning_1',2,'09:00:00','21:00:00',0),('bhour_biz_wedding-planning_1_3','biz_wedding-planning_1',3,'09:00:00','21:00:00',0),('bhour_biz_wedding-planning_1_4','biz_wedding-planning_1',4,'09:00:00','21:00:00',0),('bhour_biz_wedding-planning_1_5','biz_wedding-planning_1',5,'09:00:00','21:00:00',0),('bhour_biz_wedding-planning_1_6','biz_wedding-planning_1',6,'09:00:00','21:00:00',0),('bhour_biz_wedding-planning_2_0','biz_wedding-planning_2',0,'09:00:00','21:00:00',0),('bhour_biz_wedding-planning_2_1','biz_wedding-planning_2',1,'09:00:00','21:00:00',0),('bhour_biz_wedding-planning_2_2','biz_wedding-planning_2',2,'09:00:00','21:00:00',0),('bhour_biz_wedding-planning_2_3','biz_wedding-planning_2',3,'09:00:00','21:00:00',0),('bhour_biz_wedding-planning_2_4','biz_wedding-planning_2',4,'09:00:00','21:00:00',0),('bhour_biz_wedding-planning_2_5','biz_wedding-planning_2',5,'09:00:00','21:00:00',0),('bhour_biz_wedding-planning_2_6','biz_wedding-planning_2',6,'09:00:00','21:00:00',0),('bhour_biz_wedding-planning_3_0','biz_wedding-planning_3',0,'09:00:00','21:00:00',0),('bhour_biz_wedding-planning_3_1','biz_wedding-planning_3',1,'09:00:00','21:00:00',0),('bhour_biz_wedding-planning_3_2','biz_wedding-planning_3',2,'09:00:00','21:00:00',0),('bhour_biz_wedding-planning_3_3','biz_wedding-planning_3',3,'09:00:00','21:00:00',0),('bhour_biz_wedding-planning_3_4','biz_wedding-planning_3',4,'09:00:00','21:00:00',0),('bhour_biz_wedding-planning_3_5','biz_wedding-planning_3',5,'09:00:00','21:00:00',0),('bhour_biz_wedding-planning_3_6','biz_wedding-planning_3',6,'09:00:00','21:00:00',0),('bhour_biz-urban-decor_0','biz-urban-decor',0,'09:00:00','21:00:00',0),('bhr_biz_1793601878173_6t09_0','biz_1793601878173_6t09',0,'11:00:00','11:30:00',0),('bhr_biz_1793601878173_6t09_1','biz_1793601878173_6t09',1,'11:00:00','11:30:00',0),('bhr_biz_1793601878173_6t09_2','biz_1793601878173_6t09',2,'11:00:00','11:30:00',0),('bhr_biz_1793601878173_6t09_3','biz_1793601878173_6t09',3,'11:00:00','11:30:00',0),('bhr_biz_1793601878173_6t09_4','biz_1793601878173_6t09',4,'11:00:00','11:30:00',0),('bhr_biz_1793601878173_6t09_5','biz_1793601878173_6t09',5,'11:00:00','11:30:00',0),('bhr_biz_1793601878173_6t09_6','biz_1793601878173_6t09',6,'11:00:00','11:30:00',0),('bhr_biz_1793601887809_ksbc_0','biz_1793601887809_ksbc',0,'09:00:00','09:30:00',0),('bhr_biz_1793601887809_ksbc_1','biz_1793601887809_ksbc',1,'09:00:00','09:30:00',0),('bhr_biz_1793601887809_ksbc_2','biz_1793601887809_ksbc',2,'09:00:00','09:30:00',0),('bhr_biz_1793601887809_ksbc_3','biz_1793601887809_ksbc',3,'09:00:00','09:30:00',0),('bhr_biz_1793601887809_ksbc_4','biz_1793601887809_ksbc',4,'09:00:00','09:30:00',0),('bhr_biz_1793601887809_ksbc_5','biz_1793601887809_ksbc',5,'09:00:00','09:30:00',0),('bhr_biz_1793601887809_ksbc_6','biz_1793601887809_ksbc',6,'09:00:00','09:30:00',0),('bhr_biz_1793605138282_2xvk_0','biz_1793605138282_2xvk',0,'09:00:00','09:30:00',0),('bhr_biz_1793605138282_2xvk_1','biz_1793605138282_2xvk',1,'09:00:00','09:30:00',0),('bhr_biz_1793605138282_2xvk_2','biz_1793605138282_2xvk',2,'09:00:00','09:30:00',0),('bhr_biz_1793605138282_2xvk_3','biz_1793605138282_2xvk',3,'09:00:00','09:30:00',0),('bhr_biz_1793605138282_2xvk_4','biz_1793605138282_2xvk',4,'09:00:00','09:30:00',0),('bhr_biz_1793605138282_2xvk_5','biz_1793605138282_2xvk',5,'09:00:00','09:30:00',0),('bhr_biz_1793605138282_2xvk_6','biz_1793605138282_2xvk',6,'09:00:00','09:30:00',0),('bhr-amravati-1','biz-amravati',1,'10:30:00','23:00:00',0),('bhr-fernat-1','biz-fernat-dental',1,'09:30:00','20:30:00',0),('bhr-siri-0','biz-siri-dental',0,'10:00:00','14:00:00',0),('bhr-siri-1','biz-siri-dental',1,'09:00:00','21:00:00',0),('bhr-siri-2','biz-siri-dental',2,'09:00:00','21:00:00',0),('bhr-siri-3','biz-siri-dental',3,'09:00:00','21:00:00',0),('bhr-siri-4','biz-siri-dental',4,'09:00:00','21:00:00',0),('bhr-siri-5','biz-siri-dental',5,'09:00:00','21:00:00',0),('bhr-siri-6','biz-siri-dental',6,'09:00:00','21:00:00',0),('bhr-srinivasa-1','biz-srinivasa-packers',1,'08:00:00','22:00:00',0),('hour-amr-0','biz-amravati',0,'10:30:00','23:00:00',0),('hour-amr-2','biz-amravati',2,'10:30:00','23:00:00',0),('hour-amr-3','biz-amravati',3,'10:30:00','23:00:00',0),('hour-amr-4','biz-amravati',4,'10:30:00','23:00:00',0),('hour-amr-5','biz-amravati',5,'10:30:00','23:00:00',0),('hour-amr-6','biz-amravati',6,'10:30:00','23:00:00',0),('hour-amrinfra-1','biz-amaravati-builders',1,'09:00:00','19:00:00',0),('hour-amrinfra-2','biz-amaravati-builders',2,'09:00:00','19:00:00',0),('hour-amrinfra-3','biz-amaravati-builders',3,'09:00:00','19:00:00',0),('hour-amrinfra-4','biz-amaravati-builders',4,'09:00:00','19:00:00',0),('hour-amrinfra-5','biz-amaravati-builders',5,'09:00:00','19:00:00',0),('hour-amrinfra-6','biz-amaravati-builders',6,'09:00:00','19:00:00',0),('hour-astro-0','biz-gayatri-astro',0,'08:00:00','19:00:00',0),('hour-astro-1','biz-gayatri-astro',1,'08:00:00','19:00:00',0),('hour-astro-2','biz-gayatri-astro',2,'08:00:00','19:00:00',0),('hour-astro-3','biz-gayatri-astro',3,'08:00:00','19:00:00',0),('hour-astro-4','biz-gayatri-astro',4,'08:00:00','19:00:00',0),('hour-astro-5','biz-gayatri-astro',5,'08:00:00','19:00:00',0),('hour-astro-6','biz-gayatri-astro',6,'08:00:00','19:00:00',0),('hour-ayush-0','biz-ayush-hospital',0,'00:00:00','23:59:00',0),('hour-ayush-1','biz-ayush-hospital',1,'00:00:00','23:59:00',0),('hour-ayush-2','biz-ayush-hospital',2,'00:00:00','23:59:00',0),('hour-ayush-3','biz-ayush-hospital',3,'00:00:00','23:59:00',0),('hour-ayush-4','biz-ayush-hospital',4,'00:00:00','23:59:00',0),('hour-ayush-5','biz-ayush-hospital',5,'00:00:00','23:59:00',0),('hour-ayush-6','biz-ayush-hospital',6,'00:00:00','23:59:00',0),('hour-balaji-0','biz-balaji-tours',0,'06:00:00','23:00:00',0),('hour-balaji-1','biz-balaji-tours',1,'06:00:00','23:00:00',0),('hour-balaji-2','biz-balaji-tours',2,'06:00:00','23:00:00',0),('hour-balaji-3','biz-balaji-tours',3,'06:00:00','23:00:00',0),('hour-balaji-4','biz-balaji-tours',4,'06:00:00','23:00:00',0),('hour-balaji-5','biz-balaji-tours',5,'06:00:00','23:00:00',0),('hour-balaji-6','biz-balaji-tours',6,'06:00:00','23:00:00',0),('hour-edu-1','biz-narayana-academy',1,'08:00:00','19:00:00',0),('hour-edu-2','biz-narayana-academy',2,'08:00:00','19:00:00',0),('hour-edu-3','biz-narayana-academy',3,'08:00:00','19:00:00',0),('hour-edu-4','biz-narayana-academy',4,'08:00:00','19:00:00',0),('hour-edu-5','biz-narayana-academy',5,'08:00:00','19:00:00',0),('hour-edu-6','biz-narayana-academy',6,'08:00:00','19:00:00',0),('hour-est-0','biz-capital-estate',0,'09:00:00','20:00:00',0),('hour-est-1','biz-capital-estate',1,'09:00:00','20:00:00',0),('hour-est-2','biz-capital-estate',2,'09:00:00','20:00:00',0),('hour-est-3','biz-capital-estate',3,'09:00:00','20:00:00',0),('hour-est-4','biz-capital-estate',4,'09:00:00','20:00:00',0),('hour-est-5','biz-capital-estate',5,'09:00:00','20:00:00',0),('hour-est-6','biz-capital-estate',6,'09:00:00','20:00:00',0),('hour-fernat-0','biz-fernat-dental',0,NULL,NULL,1),('hour-fernat-2','biz-fernat-dental',2,'09:30:00','20:30:00',0),('hour-fernat-3','biz-fernat-dental',3,'09:30:00','20:30:00',0),('hour-fernat-4','biz-fernat-dental',4,'09:30:00','20:30:00',0),('hour-fernat-5','biz-fernat-dental',5,'09:30:00','20:30:00',0),('hour-fernat-6','biz-fernat-dental',6,'09:30:00','20:30:00',0),('hour-laks-0','biz-sri-lakshmi',0,'09:00:00','14:00:00',0),('hour-laks-1','biz-sri-lakshmi',1,'08:30:00','21:00:00',0),('hour-laks-2','biz-sri-lakshmi',2,'08:30:00','21:00:00',0),('hour-laks-3','biz-sri-lakshmi',3,'08:30:00','21:00:00',0),('hour-laks-4','biz-sri-lakshmi',4,'08:30:00','21:00:00',0),('hour-laks-5','biz-sri-lakshmi',5,'08:30:00','21:00:00',0),('hour-laks-6','biz-sri-lakshmi',6,'08:30:00','21:00:00',0),('hour-lotus-0','biz-lotus-spa',0,'09:00:00','21:00:00',0),('hour-lotus-1','biz-lotus-spa',1,'09:00:00','21:00:00',0),('hour-lotus-2','biz-lotus-spa',2,'09:00:00','21:00:00',0),('hour-lotus-3','biz-lotus-spa',3,'09:00:00','21:00:00',0),('hour-lotus-4','biz-lotus-spa',4,'09:00:00','21:00:00',0),('hour-lotus-5','biz-lotus-spa',5,'09:00:00','21:00:00',0),('hour-lotus-6','biz-lotus-spa',6,'09:00:00','21:00:00',0),('hour-novo-0','biz-novotel-vja',0,'09:00:00','21:00:00',0),('hour-novo-1','biz-novotel-vja',1,'09:00:00','21:00:00',0),('hour-novo-2','biz-novotel-vja',2,'09:00:00','21:00:00',0),('hour-novo-3','biz-novotel-vja',3,'09:00:00','21:00:00',0),('hour-novo-4','biz-novotel-vja',4,'09:00:00','21:00:00',0),('hour-novo-5','biz-novotel-vja',5,'09:00:00','21:00:00',0),('hour-novo-6','biz-novotel-vja',6,'09:00:00','21:00:00',0),('hour-pet-0','biz-tail-waggers',0,'09:30:00','21:00:00',0),('hour-pet-1','biz-tail-waggers',1,'09:30:00','21:00:00',0),('hour-pet-2','biz-tail-waggers',2,'09:30:00','21:00:00',0),('hour-pet-3','biz-tail-waggers',3,'09:30:00','21:00:00',0),('hour-pet-4','biz-tail-waggers',4,'09:30:00','21:00:00',0),('hour-pet-5','biz-tail-waggers',5,'09:30:00','21:00:00',0),('hour-pet-6','biz-tail-waggers',6,'09:30:00','21:00:00',0),('hour-pg-0','biz-sai-pg',0,'05:30:00','23:00:00',0),('hour-pg-1','biz-sai-pg',1,'05:30:00','23:00:00',0),('hour-pg-2','biz-sai-pg',2,'05:30:00','23:00:00',0),('hour-pg-3','biz-sai-pg',3,'05:30:00','23:00:00',0),('hour-pg-4','biz-sai-pg',4,'05:30:00','23:00:00',0),('hour-pg-5','biz-sai-pg',5,'05:30:00','23:00:00',0),('hour-pg-6','biz-sai-pg',6,'05:30:00','23:00:00',0),('hour-rent-0','biz-apex-rentals',0,'00:00:00','23:59:00',0),('hour-rent-1','biz-apex-rentals',1,'00:00:00','23:59:00',0),('hour-rent-2','biz-apex-rentals',2,'00:00:00','23:59:00',0),('hour-rent-3','biz-apex-rentals',3,'00:00:00','23:59:00',0),('hour-rent-4','biz-apex-rentals',4,'00:00:00','23:59:00',0),('hour-rent-5','biz-apex-rentals',5,'00:00:00','23:59:00',0),('hour-rent-6','biz-apex-rentals',6,'00:00:00','23:59:00',0),('hour-srini-0','biz-srinivasa-packers',0,'08:00:00','22:00:00',0),('hour-srini-2','biz-srinivasa-packers',2,'08:00:00','22:00:00',0),('hour-srini-3','biz-srinivasa-packers',3,'08:00:00','22:00:00',0),('hour-srini-4','biz-srinivasa-packers',4,'08:00:00','22:00:00',0),('hour-srini-5','biz-srinivasa-packers',5,'08:00:00','22:00:00',0),('hour-srini-6','biz-srinivasa-packers',6,'08:00:00','22:00:00',0),('hour-urban-1','biz-urban-decor',1,'09:00:00','21:00:00',0),('hour-urban-2','biz-urban-decor',2,'09:00:00','21:00:00',0),('hour-urban-3','biz-urban-decor',3,'09:00:00','21:00:00',0),('hour-urban-4','biz-urban-decor',4,'09:00:00','21:00:00',0),('hour-urban-5','biz-urban-decor',5,'09:00:00','21:00:00',0),('hour-urban-6','biz-urban-decor',6,'09:00:00','21:00:00',0),('hour-wed-0','biz-siddhi-weddings',0,'07:00:00','22:00:00',0),('hour-wed-1','biz-siddhi-weddings',1,'07:00:00','22:00:00',0),('hour-wed-2','biz-siddhi-weddings',2,'07:00:00','22:00:00',0),('hour-wed-3','biz-siddhi-weddings',3,'07:00:00','22:00:00',0),('hour-wed-4','biz-siddhi-weddings',4,'07:00:00','22:00:00',0),('hour-wed-5','biz-siddhi-weddings',5,'07:00:00','22:00:00',0),('hour-wed-6','biz-siddhi-weddings',6,'07:00:00','22:00:00',0);
/*!40000 ALTER TABLE `business_hours` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `business_locations`
--

DROP TABLE IF EXISTS `business_locations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `business_locations` (
  `id` varchar(64) NOT NULL,
  `business_id` varchar(64) NOT NULL,
  `city_id` varchar(64) NOT NULL,
  `locality_id` varchar(64) DEFAULT NULL,
  `address_line1` varchar(255) NOT NULL,
  `landmark` varchar(200) DEFAULT NULL,
  `pincode` varchar(10) NOT NULL,
  `latitude` decimal(10,7) NOT NULL,
  `longitude` decimal(10,7) NOT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `idx_bloc_biz` (`business_id`),
  KEY `idx_bloc_city` (`city_id`),
  KEY `idx_bloc_loc` (`locality_id`),
  KEY `idx_bloc_lat_lng` (`latitude`,`longitude`),
  CONSTRAINT `fk_bloc_biz` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_bloc_city` FOREIGN KEY (`city_id`) REFERENCES `cities` (`id`),
  CONSTRAINT `fk_bloc_loc` FOREIGN KEY (`locality_id`) REFERENCES `localities` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `business_locations`
--

LOCK TABLES `business_locations` WRITE;
/*!40000 ALTER TABLE `business_locations` DISABLE KEYS */;
INSERT INTO `business_locations` VALUES ('bloc_1793601878181','biz_1793601878173_6t09','city-hyd','loc-hitec','Plot 77, Cyber Towers Road',NULL,'500081',17.4435000,78.3772000,1),('bloc_1793601887838','biz_1793601887809_ksbc','city-vja','loc-benz','Ring Road, Benz Circle',NULL,'520010',16.5015000,80.6430000,1),('bloc_1793605138290','biz_1793605138282_2xvk','city-hyd','loc-kukatpally','Kukatpally, Hyderabad','','500072',17.4933000,78.3995000,1),('bloc_biz_ask-astro_1','biz_ask-astro_1','city-gun','loc-arundelpet','Arundelpet, Guntur',NULL,'522002',16.3167000,80.4465000,1),('bloc_biz_ask-astro_2','biz_ask-astro_2','city-hyd','loc_ameerpet','Ameerpet, Hyderabad',NULL,'500016',17.3950000,78.4967000,1),('bloc_biz_ask-astro_3','biz_ask-astro_3','city-vja','loc_governorpet','Governorpet, Vijayawada',NULL,'520002',16.5162000,80.6580000,1),('bloc_biz_beauty-spa_2','biz_beauty-spa_2','city-hyd','loc-madhapur','Madhapur, Hyderabad',NULL,'500081',17.3950000,78.4967000,1),('bloc_biz_beauty-spa_3','biz_beauty-spa_3','city-hyd','loc-jubilee','Jubilee Hills, Hyderabad',NULL,'500033',17.3950000,78.4967000,1),('bloc_biz_contractors_1','biz_contractors_1','city-vja','loc_labbipet','Labbipet, Vijayawada',NULL,'520010',16.5162000,80.6580000,1),('bloc_biz_contractors_2','biz_contractors_2','city-hyd','loc-madhapur','Madhapur, Hyderabad',NULL,'500081',17.3950000,78.4967000,1),('bloc_biz_contractors_3','biz_contractors_3','city-hyd','loc-kukatpally','Kukatpally, Hyderabad',NULL,'500072',17.3950000,78.4967000,1),('bloc_biz_dentists_1','biz_dentists_1','city-vja','loc-benz','Benz Circle, Vijayawada',NULL,'520010',16.5162000,80.6580000,1),('bloc_biz_dentists_2','biz_dentists_2','city-hyd','loc-banjara','Banjara Hills, Hyderabad',NULL,'500034',17.3950000,78.4967000,1),('bloc_biz_dentists_3','biz_dentists_3','city-hyd','loc-madhapur','Madhapur, Hyderabad',NULL,'500081',17.3950000,78.4967000,1),('bloc_biz_education_1','biz_education_1','city-vja','loc-benz','Benz Circle, Vijayawada',NULL,'520010',16.5162000,80.6580000,1),('bloc_biz_education_2','biz_education_2','city-hyd','loc-gachibowli','Gachibowli, Hyderabad',NULL,'500032',17.3950000,78.4967000,1),('bloc_biz_education_3','biz_education_3','city-hyd','loc-madhapur','Madhapur, Hyderabad',NULL,'500081',17.3950000,78.4967000,1),('bloc_biz_estate-agent_1','biz_estate-agent_1','city-hyd','loc-jubilee','Jubilee Hills, Hyderabad',NULL,'500033',17.3950000,78.4967000,1),('bloc_biz_estate-agent_2','biz_estate-agent_2','city-vja','loc_mg-road','MG Road, Vijayawada',NULL,'520002',16.5162000,80.6580000,1),('bloc_biz_estate-agent_3','biz_estate-agent_3','city-hyd','loc-gachibowli','Gachibowli, Hyderabad',NULL,'500032',17.3950000,78.4967000,1),('bloc_biz_home-decor_2','biz_home-decor_2','city-hyd','loc-gachibowli','Gachibowli, Hyderabad',NULL,'500032',17.3950000,78.4967000,1),('bloc_biz_home-decor_3','biz_home-decor_3','city-hyd','loc-kukatpally','Kukatpally, Hyderabad',NULL,'500072',17.3950000,78.4967000,1),('bloc_biz_hospitals_1','biz_hospitals_1','city-vja','loc_kanuru','Kanuru, Vijayawada',NULL,'520007',16.5162000,80.6580000,1),('bloc_biz_hospitals_2','biz_hospitals_2','city-hyd','loc-gachibowli','Gachibowli, Hyderabad',NULL,'500032',17.3950000,78.4967000,1),('bloc_biz_hospitals_3','biz_hospitals_3','city-hyd','loc-banjara','Banjara Hills, Hyderabad',NULL,'500034',17.3950000,78.4967000,1),('bloc_biz_hotels_2','biz_hotels_2','city-hyd','loc-hitec','Hitec City, Hyderabad',NULL,'500081',17.3950000,78.4967000,1),('bloc_biz_hotels_3','biz_hotels_3','city-vja','loc_mg-road','MG Road, Vijayawada',NULL,'520002',16.5162000,80.6580000,1),('bloc_biz_pet-shops_1','biz_pet-shops_1','city-hyd','loc-banjara','Banjara Hills, Hyderabad',NULL,'500034',17.3950000,78.4967000,1),('bloc_biz_pet-shops_2','biz_pet-shops_2','city-vja','loc_governorpet','Governorpet, Vijayawada',NULL,'520002',16.5162000,80.6580000,1),('bloc_biz_pet-shops_3','biz_pet-shops_3','city-hyd','loc-gachibowli','Gachibowli, Hyderabad',NULL,'500032',17.3950000,78.4967000,1),('bloc_biz_pg-hostels_1','biz_pg-hostels_1','city-hyd','loc-madhapur','Madhapur, Hyderabad',NULL,'500081',17.3950000,78.4967000,1),('bloc_biz_pg-hostels_2','biz_pg-hostels_2','city-vja','loc-benz','Benz Circle, Vijayawada',NULL,'520010',16.5162000,80.6580000,1),('bloc_biz_pg-hostels_3','biz_pg-hostels_3','city-hyd','loc-hitec','Hitec City, Hyderabad',NULL,'500081',17.3950000,78.4967000,1),('bloc_biz_rent-hire_1','biz_rent-hire_1','city-vja','loc_governorpet','Governorpet, Vijayawada',NULL,'520002',16.5162000,80.6580000,1),('bloc_biz_rent-hire_2','biz_rent-hire_2','city-hyd','loc-hitec','Hitec City, Hyderabad',NULL,'500081',17.3950000,78.4967000,1),('bloc_biz_rent-hire_3','biz_rent-hire_3','city-hyd','loc-kukatpally','Kukatpally, Hyderabad',NULL,'500072',17.3950000,78.4967000,1),('bloc_biz_restaurants_1','biz_restaurants_1','city-hyd','loc-banjara','Banjara Hills, Hyderabad',NULL,'500034',17.3950000,78.4967000,1),('bloc_biz_restaurants_2','biz_restaurants_2','city-hyd','loc_rtc-cross-roads','RTC Cross Roads, Hyderabad',NULL,'500020',17.3950000,78.4967000,1),('bloc_biz_restaurants_3','biz_restaurants_3','city-vja','loc-benz','Benz Circle, Vijayawada',NULL,'520010',16.5162000,80.6580000,1),('bloc_biz_wedding-planning_1','biz_wedding-planning_1','city-hyd','loc-banjara','Banjara Hills, Hyderabad',NULL,'500034',17.3950000,78.4967000,1),('bloc_biz_wedding-planning_2','biz_wedding-planning_2','city-vja','loc_moghalrajpuram','Moghalrajpuram, Vijayawada',NULL,'520010',16.5162000,80.6580000,1),('bloc_biz_wedding-planning_3','biz_wedding-planning_3','city-hyd','loc-jubilee','Jubilee Hills, Hyderabad',NULL,'500033',17.3950000,78.4967000,1),('bloc_biz-lotus-spa','biz-lotus-spa','city-vja','loc-benz','Benz Circle, Vijayawada',NULL,'520010',16.5162000,80.6580000,1),('bloc_biz-novotel-vja','biz-novotel-vja','city-vja','loc-benz','Benz Circle, Vijayawada',NULL,'520010',16.5162000,80.6580000,1),('bloc_biz-urban-decor','biz-urban-decor','city-vja','loc_labbipet','Labbipet, Vijayawada',NULL,'520010',16.5162000,80.6580000,1),('bloc-amravati','biz-amravati','city-vja','loc-benz','MG Road, Benz Circle','Beside Grand Hotel','520010',16.5015000,80.6430000,1),('bloc-bawarchi','biz-bawarchi-royal','city-vja','loc-benz','NH-16 Highway, Benz Circle','Opposite PVP Mall','520010',16.5030000,80.6410000,1),('bloc-fernat','biz-fernat-dental','city-vja','loc-nahamar','Plot 18, Bandar Road, Nahamar','Near NTR Circle','520008',16.5090000,80.6480000,1),('bloc-siri','biz-siri-dental','city-vja','loc-nahamar','D.No 40-1-52, MG Road, Nahamar','Opposite City Center Mall','520008',16.5120000,80.6515000,1),('bloc-srinivasa','biz-srinivasa-packers','city-gun','loc-brodipet','4th Lane, Brodipet Main Road','Near Hindu College','522002',16.3050000,80.4380000,1),('loc-biz-1','biz-amravati','city-vja','loc-nahamar','D.No 40-1-28, MG Road, Nahamar','Near Benz Circle Flyover','520008',16.5120000,80.6515000,1),('loc-biz-10','biz-gayatri-astro','city-gun','loc-brodipet','3rd Line, Brodipet','Opp. Sivalayam','522002',16.3060000,80.4390000,1),('loc-biz-11','biz-siddhi-weddings','city-vja','loc-onetown','Bypass Road, One Town','Near Kanakadurga Varadhi','520001',16.5170000,80.6200000,1),('loc-biz-12','biz-narayana-academy','city-vja','loc-benz','Gudavalli Road, Near Benz Circle','Opp. Sub-Collector Office','520010',16.5040000,80.6460000,1),('loc-biz-13','biz-apex-rentals','city-gun','loc-arundelpet','Main Road, Arundelpet','Near Old Bus Station','522002',16.3130000,80.4330000,1),('loc-biz-14','biz-ayush-hospital','city-vja','loc-nahamar','Ring Road, Nahamar','Near Government General Hospital','520008',16.5140000,80.6530000,1),('loc-biz-15','biz-amaravati-builders','city-vja','loc-benz','12-4-8, Benz Circle Commercial Hub','Near Axis Bank','520010',16.5010000,80.6420000,1),('loc-biz-16','biz-tail-waggers','city-vja','loc-nahamar','Nahamar High Road','Opposite Reliance Digital','520008',16.5125000,80.6510000,1),('loc-biz-17','biz-sai-pg','city-gun','loc-brodipet','5/2 Brodipet Main Road','Near RVR College Stop','522002',16.3070000,80.4370000,1),('loc-biz-18','biz-capital-estate','city-vja','loc-benz','Tower B, Level 4, Benz Circle Commercial Complex','Opposite Novotel','520010',16.5018000,80.6435000,1),('loc-biz-2','biz-siri-dental','city-vja','loc-nahamar','Plot 14, 2nd Cross, Nahamar Main Road','Behind SBI Branch','520008',16.5135000,80.6522000,1),('loc-biz-3','biz-fernat-dental','city-vja','loc-benz','Opposite Modern Mall, Benz Circle','MG Road Junction','520010',16.5015000,80.6430000,1),('loc-biz-4','biz-srinivasa-packers','city-gun','loc-brodipet','Shop #7, 4/1 Brodipet Main Road','Near Old Bus Stand','522002',16.3050000,80.4380000,1),('loc-biz-5','biz-sri-lakshmi','city-vja','loc-onetown','Kaleswara Rao Market Street, One Town','Near Kanaka Durga Temple Arch','520001',16.5180000,80.6190000,1),('loc-biz-6','biz-balaji-tours','city-gun','loc-arundelpet','Complex B-4, 7th Line, Arundelpet','Near Shankar Vilas Centre','522002',16.3120000,80.4320000,1),('loc-biz-7','biz-novotel-vja','city-vja','loc-benz','Near Benz Circle, MG Road','Opposite Joyalukkas','520010',16.5020000,80.6440000,1),('loc-biz-8','biz-lotus-spa','city-vja','loc-nahamar','Plot 22, Nahamar Ring Road','Near HDFC Bank','520008',16.5110000,80.6500000,1),('loc-biz-9','biz-urban-decor','city-vja','loc-benz','39-8-12, Bandar Road, Benz Circle','Near D-Mart','520010',16.5030000,80.6450000,1);
/*!40000 ALTER TABLE `business_locations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `business_media`
--

DROP TABLE IF EXISTS `business_media`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `business_media` (
  `id` varchar(64) NOT NULL,
  `business_id` varchar(64) NOT NULL,
  `media_url` text NOT NULL,
  `media_type` enum('IMAGE','VIDEO','DOCUMENT') NOT NULL DEFAULT 'IMAGE',
  `sort_order` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_bmedia_biz` (`business_id`),
  CONSTRAINT `fk_bmedia_biz` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `business_media`
--

LOCK TABLES `business_media` WRITE;
/*!40000 ALTER TABLE `business_media` DISABLE KEYS */;
INSERT INTO `business_media` VALUES ('bmed-1','biz-siri-dental','https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=800&auto=format&fit=crop&q=80','IMAGE',1),('bmed-2','biz-fernat-dental','https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&auto=format&fit=crop&q=80','IMAGE',1),('bmed-3','biz-amravati','https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80','IMAGE',1),('bmed-4','biz-srinivasa-packers','https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80','IMAGE',1),('bmed-5','biz-bawarchi-royal','https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=80','IMAGE',1);
/*!40000 ALTER TABLE `business_media` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `business_owners`
--

DROP TABLE IF EXISTS `business_owners`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `business_owners` (
  `id` varchar(64) NOT NULL,
  `business_id` varchar(64) NOT NULL,
  `user_id` varchar(64) NOT NULL,
  `ownership_type` enum('FOUNDER','PARTNER','CLAIMANT') NOT NULL DEFAULT 'FOUNDER',
  `is_primary` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_biz_owner` (`business_id`,`user_id`),
  KEY `idx_owner_user` (`user_id`),
  CONSTRAINT `fk_owner_biz` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_owner_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `business_owners`
--

LOCK TABLES `business_owners` WRITE;
/*!40000 ALTER TABLE `business_owners` DISABLE KEYS */;
INSERT INTO `business_owners` VALUES ('bown-1','biz-siri-dental','user-vendor-3','FOUNDER',1),('bown-2','biz-fernat-dental','user-vendor-4','FOUNDER',1),('bown-3','biz-amravati','user-vendor-1','FOUNDER',1),('bown-4','biz-srinivasa-packers','user-vendor-2','FOUNDER',1),('bown-5','biz-bawarchi-royal','user-vendor-5','FOUNDER',1);
/*!40000 ALTER TABLE `business_owners` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `business_services`
--

DROP TABLE IF EXISTS `business_services`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `business_services` (
  `id` varchar(64) NOT NULL,
  `business_id` varchar(64) NOT NULL,
  `service_name` varchar(150) NOT NULL,
  `price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `duration_minutes` int(11) DEFAULT NULL,
  `inclusions` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_bsrv_biz` (`business_id`),
  CONSTRAINT `fk_bsrv_biz` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `business_services`
--

LOCK TABLES `business_services` WRITE;
/*!40000 ALTER TABLE `business_services` DISABLE KEYS */;
INSERT INTO `business_services` VALUES ('bsrv-1','biz-siri-dental','Complete Dental Health Consultation & Digital X-Ray',300.00,30,'Full mouth intraoral scanner, digital diagnostic report, consultation'),('bsrv-2','biz-siri-dental','Single Sitting Rotary Root Canal Treatment (RCT)',3500.00,60,'Crown prep, pain-free rotary instrumentation, temporary seal'),('bsrv-3','biz-siri-dental','Clear Invisible Aligners (Starter Pack)',28000.00,45,'3D digital smile simulation, 10 custom aligner trays'),('bsrv-4','biz-amravati','Royal Special Andhra Mutton Dum Biryani (Family Pack)',799.00,20,'Fragrant aged Basmati rice, double masala, Mirchi Ka Salan, Raitha'),('bsrv-5','biz-srinivasa-packers','1-BHK Local Household Shifting within Vijayawada',4500.00,180,'Multi-layer bubble wrap, packing, loading, dedicated closed truck transit');
/*!40000 ALTER TABLE `business_services` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `business_staff`
--

DROP TABLE IF EXISTS `business_staff`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `business_staff` (
  `id` varchar(64) NOT NULL,
  `business_id` varchar(64) NOT NULL,
  `user_id` varchar(64) NOT NULL,
  `role` varchar(50) NOT NULL DEFAULT 'STAFF',
  `status` enum('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_biz_staff` (`business_id`,`user_id`),
  KEY `fk_staff_user` (`user_id`),
  CONSTRAINT `fk_staff_biz` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_staff_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `business_staff`
--

LOCK TABLES `business_staff` WRITE;
/*!40000 ALTER TABLE `business_staff` DISABLE KEYS */;
/*!40000 ALTER TABLE `business_staff` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `businesses`
--

DROP TABLE IF EXISTS `businesses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `businesses` (
  `id` varchar(64) NOT NULL,
  `name` varchar(200) NOT NULL,
  `legal_name` varchar(255) DEFAULT NULL,
  `slug` varchar(200) NOT NULL,
  `description` text DEFAULT NULL,
  `primary_phone` varchar(20) NOT NULL,
  `whatsapp_number` varchar(20) DEFAULT NULL,
  `support_email` varchar(191) DEFAULT NULL,
  `logo_url` text DEFAULT NULL,
  `cover_image_url` text DEFAULT NULL,
  `status` enum('PENDING','UNDER_REVIEW','APPROVED','REJECTED','SUSPENDED') NOT NULL DEFAULT 'APPROVED',
  `is_verified` tinyint(1) NOT NULL DEFAULT 0,
  `verified_at` datetime DEFAULT NULL,
  `is_featured` tinyint(1) NOT NULL DEFAULT 0,
  `average_rating` decimal(3,2) NOT NULL DEFAULT 0.00,
  `total_reviews` int(11) NOT NULL DEFAULT 0,
  `total_enquiries` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `idx_biz_slug` (`slug`),
  KEY `idx_biz_status_ver` (`status`,`is_verified`),
  KEY `idx_biz_featured` (`is_featured`),
  KEY `idx_biz_rating` (`average_rating`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `businesses`
--

LOCK TABLES `businesses` WRITE;
/*!40000 ALTER TABLE `businesses` DISABLE KEYS */;
INSERT INTO `businesses` VALUES ('biz_1793601878173_6t09','Paradise Biryani & Kebabs','Paradise Food Court Pvt Ltd','paradise-biryani-kebabs-638','Paradise Biryani & Kebabs is a premier verified provider in Hitec City, Hyderabad. Contact for immediate services and bookings.','+91 98480 77665','+91 98480 77665','contact@paradisebiryani.in','https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80','https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80','APPROVED',1,'2026-11-02 06:44:38',1,4.90,1,0,'2026-11-02 06:44:38','2026-11-02 06:44:38'),('biz_1793601887809_ksbc','Apollo Dental Laser Care','Apollo Clinics Ltd','apollo-dental-laser-care-128','Apollo Dental Laser Care is a premier verified provider in Benz Circle, Vijayawada. Contact for immediate services and bookings.','+91 98480 88990','+91 98480 88990','partner@business.in','https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=800&auto=format&fit=crop&q=80','https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=800&auto=format&fit=crop&q=80','APPROVED',1,'2026-11-02 06:44:47',1,4.90,1,0,'2026-11-02 06:44:47','2026-11-02 06:44:47'),('biz_1793605138282_2xvk','Krishna Sweets & Bakery','Krishna Sweets & Bakery','krishna-sweets-bakery-814','Krishna Sweets & Bakery is a premier verified provider in Kukatpally, Hyderabad. Contact for immediate services and bookings.','+91 98765 43210','+91 98765 43210','partner@business.in','https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80','https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80','APPROVED',1,'2026-11-02 07:38:58',1,4.90,1,0,'2026-11-02 07:38:58','2026-11-02 07:38:58'),('biz_ask-astro_1','Sri Gayatri Vedic Jyothishya & Vastu Kendra','Sri Gayatri Vedic Jyothishya & Vastu Kendra','sri-gayatri-vedic-jyothishya-vastu-kendra-11','Accurate planetary horoscope analysis, gemological gemstone guidance, career matchmaking kundali, and commercial Vastu corrections by hereditary scholars.','+91 98480 77111','+91 98480 77111','contact@sri-gayatri-ved.in',NULL,'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=800&auto=format&fit=crop&q=80','APPROVED',1,'2026-11-02 07:47:01',1,4.90,120,0,'2026-11-02 07:47:01','2026-11-02 07:47:01'),('biz_ask-astro_2','Nakshatra Astro Divine Solutions & Numerology','Nakshatra Astro Divine Solutions & Numerology','nakshatra-astro-divine-solutions-numerology-22','Scientific birth chart readings, corporate business name numerology, dosha nivarana pujas, and astrological gemstone certification with online video consults.','+91 98480 77222','+91 98480 77222','contact@nakshatra-astro.in',NULL,'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80','APPROVED',1,'2026-11-02 07:47:01',1,4.80,84,0,'2026-11-02 07:47:01','2026-11-02 07:47:01'),('biz_ask-astro_3','Maharshi Vastu & Prashna Shastra Ashram','Maharshi Vastu & Prashna Shastra Ashram','maharshi-vastu-prashna-shastra-ashram-33','Ancient Prashna astrology, factory land energy auditing, residential directional vastu without demolition, and auspicious muhurtham determination.','+91 98480 77333','+91 98480 77333','contact@maharshi-vastu-.in',NULL,'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&auto=format&fit=crop&q=80','APPROVED',1,'2026-11-02 07:47:01',1,4.90,92,0,'2026-11-02 07:47:01','2026-11-02 07:47:01'),('biz_beauty-spa_2','Naturals Signature Salon & Hair Aesthetics','Naturals Signature Salon & Hair Aesthetics','naturals-signature-salon-hair-aesthetics-22','Premium unisex salon offering keratin botox hair rituals, crystal manicure-pedicure, skin lightening therapies, and pre-wedding makeup packages.','+91 98480 55222','+91 98480 55222','contact@naturals-signat.in',NULL,'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80','APPROVED',1,'2026-11-02 07:47:01',1,4.70,112,0,'2026-11-02 07:47:01','2026-11-02 07:47:01'),('biz_beauty-spa_3','Aura Luxury Wellness & Thai Aromatherapy','Aura Luxury Wellness & Thai Aromatherapy','aura-luxury-wellness-thai-aromatherapy-33','Exclusive thermal sauna, authentic Balinese body scrub, couple massage suites, and deep relaxation treatments in a tranquil aroma-infused ambience.','+91 98480 55333','+91 98480 55333','contact@aura-luxury-wel.in',NULL,'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&auto=format&fit=crop&q=80','APPROVED',1,'2026-11-02 07:47:01',1,4.90,94,0,'2026-11-02 07:47:01','2026-11-02 07:47:01'),('biz_contractors_1','BuildTech Structural Civil Engineers & Builders','BuildTech Structural Civil Engineers & Builders','buildtech-structural-civil-engineers-builders-11','Turnkey residential villa construction, commercial RCC building framework, municipal layout plan sanctions, and seismic resistant structural engineering.','+91 98480 14111','+91 98480 14111','contact@buildtech-struc.in',NULL,'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&auto=format&fit=crop&q=80','APPROVED',1,'2026-11-02 07:47:39',1,4.80,72,0,'2026-11-02 07:47:39','2026-11-02 07:47:39'),('biz_contractors_2','ProPlumb & Electrics Commercial Engineering','ProPlumb & Electrics Commercial Engineering','proplumb-electrics-commercial-engineering-22','Licensed electrical grade-A contracting, automated fire suppression sprinkler installation, sewage water treatment plants, and smart lighting wiring.','+91 98480 14222','+91 98480 14222','contact@proplumb-electr.in',NULL,'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&auto=format&fit=crop&q=80','APPROVED',1,'2026-11-02 07:47:39',1,4.70,65,0,'2026-11-02 07:47:39','2026-11-02 07:47:39'),('biz_contractors_3','WaterSeal Polyurethane Roof Waterproofing','WaterSeal Polyurethane Roof Waterproofing','waterseal-polyurethane-roof-waterproofing-33','10-year guaranteed crystalline roof slab waterproofing, expansion joint caulking, basement damp proofing, and heat reflective cooling roof paints.','+91 98480 14333','+91 98480 14333','contact@waterseal-polyu.in',NULL,'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&auto=format&fit=crop&q=80','APPROVED',1,'2026-11-02 07:47:39',1,4.80,82,0,'2026-11-02 07:47:39','2026-11-02 07:47:39'),('biz_dentists_1','Siri Multispeciality Dental Hospital & Implant Center','Siri Multispeciality Dental Hospital & Implant Center','siri-multispeciality-dental-hospital-implant-center-11','Painless root canal treatment, 3D intraoral dental scanners, titanium dental implants, clear invisible teeth aligners, and cosmetic smile designing.','+91 98480 18111','+91 98480 18111','contact@siri-multispeci.in',NULL,'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=800&auto=format&fit=crop&q=80','APPROVED',1,'2026-11-02 07:47:40',1,4.90,145,0,'2026-11-02 07:47:40','2026-11-02 07:47:40'),('biz_dentists_2','Apollo Dental Clinic & Laser Aesthetics','Apollo Dental Clinic & Laser Aesthetics','apollo-dental-clinic-laser-aesthetics-22','Laser gum surgery, pediatric child dentistry, wisdom tooth painless extractions, zirconia crowns, and European CE certified sterilisation protocols.','+91 98480 18222','+91 98480 18222','contact@apollo-dental-c.in',NULL,'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=800&auto=format&fit=crop&q=80','APPROVED',1,'2026-11-02 07:47:40',1,4.90,160,0,'2026-11-02 07:47:40','2026-11-02 07:47:40'),('biz_dentists_3','FMS Super Dental Hospital & Maxillofacial Care','FMS Super Dental Hospital & Maxillofacial Care','fms-super-dental-hospital-maxillofacial-care-33','NABH-accredited dental hospital, full mouth rehabilitation, CAD-CAM digital crowns in 1 hour, teeth whitening, and jaw fracture trauma surgery.','+91 98480 18333','+91 98480 18333','contact@fms-super-denta.in',NULL,'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&auto=format&fit=crop&q=80','APPROVED',1,'2026-11-02 07:47:40',1,4.80,122,0,'2026-11-02 07:47:40','2026-11-02 07:47:40'),('biz_education_1','Sri Chaitanya Techno Junior College & IIT Academy','Sri Chaitanya Techno Junior College & IIT Academy','sri-chaitanya-techno-junior-college-iit-academy-11','Pioneering STEM education, JEE Advanced top national rank preparation, NEET medical coaching, and modern air-conditioned digital smart classrooms.','+91 98480 99111','+91 98480 99111','contact@sri-chaitanya-t.in',NULL,'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80','APPROVED',1,'2026-11-02 07:47:39',1,4.80,165,0,'2026-11-02 07:47:39','2026-11-02 07:47:39'),('biz_education_2','Oakridge International STEM Day School','Oakridge International STEM Day School','oakridge-international-stem-day-school-22','IB and CBSE curriculum, robotics innovation labs, Olympic-size sports arenas, foreign language training, and global university placement mentorship.','+91 98480 99222','+91 98480 99222','contact@oakridge-intern.in',NULL,'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800&auto=format&fit=crop&q=80','APPROVED',1,'2026-11-02 07:47:39',1,4.90,140,0,'2026-11-02 07:47:39','2026-11-02 07:47:39'),('biz_education_3','Time Institute CAT & Bank Exam Training Hub','Time Institute CAT & Bank Exam Training Hub','time-institute-cat-bank-exam-training-hub-33','India\'s premier MBA entrance coaching center, CAT percentile strategy, campus recruitment training, and national level all-India mock tests.','+91 98480 99333','+91 98480 99333','contact@time-institute-.in',NULL,'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800&auto=format&fit=crop&q=80','APPROVED',1,'2026-11-02 07:47:39',1,4.70,96,0,'2026-11-02 07:47:39','2026-11-02 07:47:39'),('biz_estate-agent_1','Prime Estates & Luxury Villa Advisory','Prime Estates & Luxury Villa Advisory','prime-estates-luxury-villa-advisory-11','RERA-registered real estate brokerage, gated community luxury villas, commercial IT office spaces, and agricultural farm land investments in Amaravati & Hyd.','+91 98480 17111','+91 98480 17111','contact@prime-estates-l.in',NULL,'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=80','APPROVED',1,'2026-11-02 07:47:40',1,4.90,130,0,'2026-11-02 07:47:40','2026-11-02 07:47:40'),('biz_estate-agent_2','Capital City Realtors & Property Managers','Capital City Realtors & Property Managers','capital-city-realtors-property-managers-22','Verified residential flats for rent and sale, clear title DTCP approved open plots, property valuation, legal documentation, and bank loan clearance.','+91 98480 17222','+91 98480 17222','contact@capital-city-re.in',NULL,'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&auto=format&fit=crop&q=80','APPROVED',1,'2026-11-02 07:47:40',1,4.80,98,0,'2026-11-02 07:47:40','2026-11-02 07:47:40'),('biz_estate-agent_3','Nexus Commercial Office Space Specialists','Nexus Commercial Office Space Specialists','nexus-commercial-office-space-specialists-33','Plug-and-play furnished tech park floors, high-street retail showrooms, warehouse logistics leases, and institutional real estate tenant representation.','+91 98480 17333','+91 98480 17333','contact@nexus-commercia.in',NULL,'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&fit=crop&q=80','APPROVED',1,'2026-11-02 07:47:40',1,4.80,75,0,'2026-11-02 07:47:40','2026-11-02 07:47:40'),('biz_home-decor_2','DecoCraft Wooden Furnishings & Wall Accents','DecoCraft Wooden Furnishings & Wall Accents','decocraft-wooden-furnishings-wall-accents-22','Solid teakwood handcrafted sofas, designer accent chairs, imported lighting fixtures, motorized blinds, and customized wallpaper installations.','+91 98480 66222','+91 98480 66222','contact@decocraft-woode.in',NULL,'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&auto=format&fit=crop&q=80','APPROVED',1,'2026-11-02 07:47:01',1,4.90,105,0,'2026-11-02 07:47:01','2026-11-02 07:47:01'),('biz_home-decor_3','Elite Glass & Aluminum Architectural Interiors','Elite Glass & Aluminum Architectural Interiors','elite-glass-aluminum-architectural-interiors-33','Frameless toughened shower cubicles, acoustic soundproof UPVC windows, sliding glass partitions, and designer mirror work for modern residences.','+91 98480 66333','+91 98480 66333','contact@elite-glass-alu.in',NULL,'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80','APPROVED',1,'2026-11-02 07:47:01',1,4.70,64,0,'2026-11-02 07:47:01','2026-11-02 07:47:01'),('biz_hospitals_1','Kamineni Multispeciality & Cardiac Super Hospital','Kamineni Multispeciality & Cardiac Super Hospital','kamineni-multispeciality-cardiac-super-hospital-11','24/7 Level-1 trauma care, advanced cath lab, robotic joint replacements, liver transplant program, and dedicated pediatric ICU with NABH accreditation.','+91 98480 13111','+91 98480 13111','contact@kamineni-multis.in',NULL,'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=800&auto=format&fit=crop&q=80','APPROVED',1,'2026-11-02 07:47:39',1,4.90,180,0,'2026-11-02 07:47:39','2026-11-02 07:47:39'),('biz_hospitals_2','AIG Institute of Gastroenterology & Liver Sciences','AIG Institute of Gastroenterology & Liver Sciences','aig-institute-of-gastroenterology-liver-sciences-22','Global center of excellence in digestive diseases, laparoscopic robotic oncology, modern endoscopy suites, and comprehensive health checkup packages.','+91 98480 13222','+91 98480 13222','contact@aig-institute-o.in',NULL,'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&auto=format&fit=crop&q=80','APPROVED',1,'2026-11-02 07:47:39',1,4.90,240,0,'2026-11-02 07:47:39','2026-11-02 07:47:39'),('biz_hospitals_3','Rainbow Children\'s Hospital & BirthRight Centre','Rainbow Children\'s Hospital & BirthRight Centre','rainbow-children-s-hospital-birthright-centre-33','India\'s premier perinatal healthcare center, advanced NICU, fetal medicine, pediatric cardiology, and painless delivery maternity suites.','+91 98480 13333','+91 98480 13333','contact@rainbow-childre.in',NULL,'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800&auto=format&fit=crop&q=80','APPROVED',1,'2026-11-02 07:47:39',1,4.80,155,0,'2026-11-02 07:47:39','2026-11-02 07:47:39'),('biz_hotels_2','ITC Kohenur Luxury Business Resort','ITC Kohenur Luxury Business Resort','itc-kohenur-luxury-business-resort-22','Premier 5-star luxury hotel in Hitec City offering lake views, award-winning specialty restaurants, sustainable architecture, and royal wellness spa.','+91 98480 44222','+91 98480 44222','contact@itc-kohenur-lux.in',NULL,'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&auto=format&fit=crop&q=80','APPROVED',1,'2026-11-02 07:47:00',1,4.90,210,0,'2026-11-02 07:47:00','2026-11-02 07:47:00'),('biz_hotels_3','Taj Gateway Krishna Riverside Hotel','Taj Gateway Krishna Riverside Hotel','taj-gateway-krishna-riverside-hotel-33','Upscale business hotel with contemporary guest rooms, banquet suites, complimentary airport transfers, and authentic coastal Andhra delicacies.','+91 98480 44333','+91 98480 44333','contact@taj-gateway-kri.in',NULL,'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&auto=format&fit=crop&q=80','APPROVED',1,'2026-11-02 07:47:00',1,4.80,134,0,'2026-11-02 07:47:00','2026-11-02 07:47:00'),('biz_pet-shops_1','Paws & Claws Complete Pet Clinic & Spa','Paws & Claws Complete Pet Clinic & Spa','paws-claws-complete-pet-clinic-spa-11','Vaccination and wellness vet clinic, climate-controlled boarding suites, breed-specific grooming hydrobaths, and Royal Canin nutritional food hub.','+91 98480 15111','+91 98480 15111','contact@paws-claws-comp.in',NULL,'https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=800&auto=format&fit=crop&q=80','APPROVED',1,'2026-11-02 07:47:39',1,4.90,118,0,'2026-11-02 07:47:39','2026-11-02 07:47:39'),('biz_pet-shops_2','Krishna Aquarium World & Exotic Pet Supplies','Krishna Aquarium World & Exotic Pet Supplies','krishna-aquarium-world-exotic-pet-supplies-22','Custom imported planted fish tanks, marine reef aquariums, pet accessories, hypoallergenic dog biscuits, and orthopedic sleeping beds.','+91 98480 15222','+91 98480 15222','contact@krishna-aquariu.in',NULL,'https://images.unsplash.com/photo-1535294435445-d7249524ef2e?w=800&auto=format&fit=crop&q=80','APPROVED',1,'2026-11-02 07:47:40',1,4.70,74,0,'2026-11-02 07:47:40','2026-11-02 07:47:40'),('biz_pet-shops_3','Happy Tails Certified Dog Training & Puppy Nursery','Happy Tails Certified Dog Training & Puppy Nursery','happy-tails-certified-dog-training-puppy-nursery-33','Positive reinforcement obedience training, agility obstacle courses, socialization day camps, and purebred KCI certified pedigree pet guidance.','+91 98480 15333','+91 98480 15333','contact@happy-tails-cer.in',NULL,'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800&auto=format&fit=crop&q=80','APPROVED',1,'2026-11-02 07:47:40',1,4.80,90,0,'2026-11-02 07:47:40','2026-11-02 07:47:40'),('biz_pg-hostels_1','Zolo Stays Luxury Executive Co-Living PG','Zolo Stays Luxury Executive Co-Living PG','zolo-stays-luxury-executive-co-living-pg-11','Fully furnished air-conditioned single and twin sharing suites, high-speed 300 Mbps Wi-Fi, daily housekeeping, 3-time buffet meals, and biometric security.','+91 98480 16111','+91 98480 16111','contact@zolo-stays-luxu.in',NULL,'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&auto=format&fit=crop&q=80','APPROVED',1,'2026-11-02 07:47:40',1,4.80,125,0,'2026-11-02 07:47:40','2026-11-02 07:47:40'),('biz_pg-hostels_2','Sri Sai Ram Women\'s Safe Luxury Hostel','Sri Sai Ram Women\'s Safe Luxury Hostel','sri-sai-ram-women-s-safe-luxury-hostel-22','CCTV monitored safe girls hostel, attached hygienic bathrooms, RO mineral water, North and South Indian fresh mess, and 100% power backup.','+91 98480 16222','+91 98480 16222','contact@sri-sai-ram-wom.in',NULL,'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=800&auto=format&fit=crop&q=80','APPROVED',1,'2026-11-02 07:47:40',1,4.70,86,0,'2026-11-02 07:47:40','2026-11-02 07:47:40'),('biz_pg-hostels_3','Hitec Urban Pods Techie Co-Living Spaces','Hitec Urban Pods Techie Co-Living Spaces','hitec-urban-pods-techie-co-living-spaces-33','Modern Scandinavian style co-living spaces with gaming lounges, co-working workstations, gym, terrace cafe, and laundry facilities next to IT corridor.','+91 98480 16333','+91 98480 16333','contact@hitec-urban-pod.in',NULL,'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&auto=format&fit=crop&q=80','APPROVED',1,'2026-11-02 07:47:40',1,4.90,110,0,'2026-11-02 07:47:40','2026-11-02 07:47:40'),('biz_rent-hire_1','Srinivasa Intercity Packers & Logistics','Srinivasa Intercity Packers & Logistics','srinivasa-intercity-packers-logistics-11','Household relocation, multi-layer waterproof furniture packing, enclosed GPS car carrier transit, and corporate office shifting with zero transit damage.','+91 98480 12111','+91 98480 12111','contact@srinivasa-inter.in',NULL,'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=80','APPROVED',1,'2026-11-02 07:47:39',1,4.80,115,0,'2026-11-02 07:47:39','2026-11-02 07:47:39'),('biz_rent-hire_2','DriveSafe Self-Drive Car & SUV Rentals','DriveSafe Self-Drive Car & SUV Rentals','drivesafe-self-drive-car-suv-rentals-22','Fleet of sanitised automatic SUVs, Thar 4x4, luxury sedans, unlimited kilometer options, zero security deposit, and 24/7 roadside assistance.','+91 98480 12222','+91 98480 12222','contact@drivesafe-self-.in',NULL,'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&auto=format&fit=crop&q=80','APPROVED',1,'2026-11-02 07:47:39',1,4.90,142,0,'2026-11-02 07:47:39','2026-11-02 07:47:39'),('biz_rent-hire_3','MegaPower Silent DG Generator & Construction Rentals','MegaPower Silent DG Generator & Construction Rentals','megapower-silent-dg-generator-construction-rentals-33','Industrial diesel generator sets from 15kVA to 500kVA for wedding events, IT data centers, hospital backups, and hydraulic crane hiring.','+91 98480 12333','+91 98480 12333','contact@megapower-silen.in',NULL,'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80','APPROVED',1,'2026-11-02 07:47:39',1,4.70,68,0,'2026-11-02 07:47:39','2026-11-02 07:47:39'),('biz_restaurants_1','Chutneys Vegetarian & South Indian Delicacies','Chutneys Vegetarian & South Indian Delicacies','chutneys-vegetarian-south-indian-delicacies-11','Iconic South Indian culinary institution famous for Babai Idli, Guntur Dosa, and 7 varieties of freshly ground chutneys in a hygienic family atmosphere.','+91 98480 33111','+91 98480 33111','contact@chutneys-vegeta.in',NULL,'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop&q=80','APPROVED',1,'2026-11-02 07:46:34',1,4.80,142,0,'2026-11-02 07:46:34','2026-11-02 07:46:34'),('biz_restaurants_2','Bawarchi Royal Hyderabadi Dum Biryani','Bawarchi Royal Hyderabadi Dum Biryani','bawarchi-royal-hyderabadi-dum-biryani-22','Authentic coal-fired Hyderabadi Dum Biryani, spicy Haleem, and signature Mirchi Ka Salan loved by generations of food connoisseurs across Telangana.','+91 98480 33222','+91 98480 33222','contact@bawarchi-royal-.in',NULL,'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=80','APPROVED',1,'2026-11-02 07:46:34',1,4.90,280,0,'2026-11-02 07:46:34','2026-11-02 07:46:34'),('biz_restaurants_3','Minerva Grand Blue Fox Multi-Cuisine Bar & Dining','Minerva Grand Blue Fox Multi-Cuisine Bar & Dining','minerva-grand-blue-fox-multi-cuisine-bar-dining-33','Fine dining multi-cuisine restaurant serving traditional Andhra thalis, Continental sizzlers, and Tandoori specialties with premier banquet facilities.','+91 98480 33333','+91 98480 33333','contact@minerva-grand-b.in',NULL,'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80','APPROVED',1,'2026-11-02 07:46:34',1,4.70,95,0,'2026-11-02 07:46:34','2026-11-02 07:46:34'),('biz_wedding-planning_1','Royal Mandapam Grand Weddings & Events','Royal Mandapam Grand Weddings & Events','royal-mandapam-grand-weddings-events-11','Turnkey luxury destination wedding management, royal theme stage decorations, LED dance floors, live acoustic bands, and custom bridal entries.','+91 98480 88111','+91 98480 88111','contact@royal-mandapam-.in',NULL,'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&auto=format&fit=crop&q=80','APPROVED',1,'2026-11-02 07:47:01',1,4.90,110,0,'2026-11-02 07:47:01','2026-11-02 07:47:01'),('biz_wedding-planning_2','Kalyanam Traditional Andhra Wedding Planners','Kalyanam Traditional Andhra Wedding Planners','kalyanam-traditional-andhra-wedding-planners-22','Specialists in Vedic rituals, authentic south Indian brass decor, flower shamianas, shehnai artists, and 5-tier traditional wedding catering.','+91 98480 88222','+91 98480 88222','contact@kalyanam-tradit.in',NULL,'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&auto=format&fit=crop&q=80','APPROVED',1,'2026-11-02 07:47:01',1,4.80,78,0,'2026-11-02 07:47:01','2026-11-02 07:47:01'),('biz_wedding-planning_3','Bliss Cinematic Wedding Photography & Films','Bliss Cinematic Wedding Photography & Films','bliss-cinematic-wedding-photography-films-33','Candid bridal photography, 4K aerial cinematic drone videos, pre-wedding destination shoots, and personalized handcrafted storybook albums.','+91 98480 88333','+91 98480 88333','contact@bliss-cinematic.in',NULL,'https://images.unsplash.com/photo-1606800052052-a08af7148866?w=800&auto=format&fit=crop&q=80','APPROVED',1,'2026-11-02 07:47:01',1,4.90,135,0,'2026-11-02 07:47:01','2026-11-02 07:47:01'),('biz-amaravati-builders','Amaravati Civil & Turnkey Infrastructure Contractors','Amaravati Infra Build Pvt Ltd','amaravati-civil-contractors','Government licensed class-1 civil building contractors, commercial towers, structural waterproofing, borewells, and RCC foundation.','+919848077779','+919848077779','projects@amaravatiinfra.in','https://images.unsplash.com/photo-1541888946425-d0fbb186156f?w=150&auto=format&fit=crop&q=80','https://images.unsplash.com/photo-1541888946425-d0fbb186156f?w=800&auto=format&fit=crop&q=80','APPROVED',1,'2026-10-30 08:08:25',1,4.80,83,110,'2026-10-30 08:08:25','2026-10-30 08:08:25'),('biz-amravati','Amravati Grand Restaurant','Amravati Hospitality Pvt Ltd','amravati-grand-restaurant','Premier authentic Andhra cuisine, royal thali, aromatic clay-pot biryani, and family fine dining in the heart of Vijayawada.','+919848011111','+919848011111','contact@amravatigrand.in','https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=150&auto=format&fit=crop&q=80','https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80','APPROVED',1,'2026-11-02 12:54:09',1,4.80,124,183,'2026-11-02 12:54:09','2026-10-30 06:14:22'),('biz-apex-rentals','Apex Self-Drive Cars & Equipment Rentals','Apex Mobility Services','apex-self-drive-cars-rentals','Zero-deposit self-drive hatchbacks, SUVs, luxury wedding cars, heavy generator sets, and industrial sound equipment rentals.','+919848077777','+919848077777','bookings@apexrentals.in','https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=150&auto=format&fit=crop&q=80','https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=80','APPROVED',1,'2026-10-30 08:08:25',1,4.80,146,195,'2026-10-30 08:08:25','2026-10-30 08:08:25'),('biz-ayush-hospital','Ayush Multispeciality 24/7 Hospital & Trauma Care','Ayush Healthcare Systems Ltd','ayush-multispeciality-hospital','NABH accredited 200-bed hospital with 24/7 emergency trauma, cardiology, pediatric ICU, orthopedic surgery, and in-house pharmacy.','+919848077778','+919848077778','emergency@ayushhospitals.in','https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=150&auto=format&fit=crop&q=80','https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=800&auto=format&fit=crop&q=80','APPROVED',1,'2026-10-30 08:08:25',1,4.90,289,340,'2026-10-30 08:08:25','2026-10-30 08:08:25'),('biz-balaji-tours','Balaji Tours & Travel AP','Balaji Travels Andhra Pradesh','balaji-tours-travel-ap','Complete travel solutions across Andhra Pradesh: Tirupati packages, Vijayawada to Hyderabad airport cabs, and luxury coach rentals.','+919848066666','+919848066666','bookings@balajitravelsap.com','https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=150&auto=format&fit=crop&q=80','https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&auto=format&fit=crop&q=80','APPROVED',1,'2026-10-30 06:14:22',0,4.70,64,92,'2026-10-30 06:14:22','2026-10-30 06:14:22'),('biz-bawarchi-royal','Bawarchi Royal Hyderabadi Biryani','Bawarchi Royal Foods Andhra','bawarchi-royal-hyderabadi-biryani','World-famous slow dum cooked Hyderabadi mutton biryani, chicken 65, butter garlic naan, and Mughlai family banquet.','+919848055555','+919848055555','info@bawarchiroyal.in','https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=150&auto=format&fit=crop&q=80','https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=80','APPROVED',1,'2026-11-02 12:54:09',1,4.90,240,480,'2026-11-02 12:54:09','2026-11-02 12:54:09'),('biz-capital-estate','Capital City Real Estate & CRDA Plots Consultancy','Capital City Properties Pvt Ltd','capital-city-real-estate-crda','Verified CRDA approved open plots, premium 2BHK/3BHK luxury gated apartments, commercial office space leasing, and zero brokerage support.','+919848077782','+919848077782','deals@capitalcityrealestate.in','https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=150&auto=format&fit=crop&q=80','https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&auto=format&fit=crop&q=80','APPROVED',1,'2026-10-30 08:08:25',1,4.90,174,290,'2026-10-30 08:08:25','2026-10-30 08:08:25'),('biz-fernat-dental','Fernat Dental Business','Fernat Health & Laser Dental Clinic','fernat-dental-business','Modern dental care clinic offering complete oral checkups, scaling, pediatric dental solutions and implants.','+919848044444','+919848044444','appointments@fernatdental.com','https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=150&auto=format&fit=crop&q=80','https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&auto=format&fit=crop&q=80','APPROVED',1,'2026-11-02 12:54:09',1,4.80,96,88,'2026-11-02 12:54:09','2026-10-30 06:14:22'),('biz-gayatri-astro','Sri Gayatri Vedic Jyothishya & Vastu','Sri Gayatri Astrological Research Center','sri-gayatri-vedic-jyothishya-vastu','Renowned traditional Vedic scholar with 25+ years experience in horoscope matchmaking, residential Vastu corrections, and muhurtham.','+919848077774','+919848077774','consult@gayatriastro.in','https://images.unsplash.com/photo-1532012197267-da84d127e765?w=150&auto=format&fit=crop&q=80','https://images.unsplash.com/photo-1532012197267-da84d127e765?w=800&auto=format&fit=crop&q=80','APPROVED',1,'2026-10-30 08:08:25',1,4.90,185,240,'2026-10-30 08:08:25','2026-10-30 08:08:25'),('biz-lotus-spa','Lotus Ayurvedic Spa & Bridal Studio','Lotus Wellness & Beauty Pvt Ltd','lotus-spa-bridal-studio','Holistic herbal rejuvenation, Swedish therapeutic massages, destination bridal makeovers, and organic salon packages certified by expert cosmetologists.','+919848077772','+919848077772','glow@lotusspa.in','https://images.unsplash.com/photo-1560066984-138dadb4c035?w=150&auto=format&fit=crop&q=80','https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=80','APPROVED',1,'2026-10-30 08:08:25',1,4.80,88,156,'2026-10-30 08:08:25','2026-11-02 13:17:01'),('biz-narayana-academy','Sri Chaitanya & Narayana NEET/IIT Academy','Narayana Educational Institutions Ltd','narayana-neet-iit-academy','Premier coaching institution with top state ranks in NEET, JEE Mains & Advanced, with residential campus and expert faculty.','+919848077776','+919848077776','admissions@narayanaacademy.in','https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=150&auto=format&fit=crop&q=80','https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80','APPROVED',1,'2026-10-30 08:08:25',1,4.70,210,380,'2026-10-30 08:08:25','2026-10-30 08:08:25'),('biz-novotel-vja','Novotel Varun Hotel & Suites','Varun Hospitality Group Ltd','novotel-varun-hotel-suites','Luxury 5-star business and leisure hotel featuring panoramic river views, rooftop infinity pool, 24/7 fitness club, and premium corporate event halls.','+919848077771','+919848077771','reservations@novotelvarun.in','https://images.unsplash.com/photo-1566073771259-6a8506099945?w=150&auto=format&fit=crop&q=80','https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&auto=format&fit=crop&q=80','APPROVED',1,'2026-10-30 08:08:25',1,4.90,168,410,'2026-10-30 08:08:25','2026-11-02 13:16:34'),('biz-sai-pg','Sri Sai Deluxe Executive AC Hostel & PG','Sri Sai Hospitality Accommodations','sri-sai-deluxe-executive-pg','High-speed 200Mbps Wi-Fi, 3 times unlimited South Indian meals, biometric 24/7 security, attached AC washrooms, and power backup.','+919848077781','+919848077781','admissions@srisaipg.in','https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=150&auto=format&fit=crop&q=80','https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&auto=format&fit=crop&q=80','APPROVED',1,'2026-10-30 08:08:25',1,4.80,128,210,'2026-10-30 08:08:25','2026-10-30 08:08:25'),('biz-siddhi-weddings','Siddhi Vinayaka Kalyana Mandapam & Event Decor','Siddhi Vinayaka Conventions Pvt Ltd','siddhi-vinayaka-kalyana-mandapam','Air-conditioned convention hall with 1,500 seating capacity, 50 deluxe guest rooms, grand stage decoration, and royal catering.','+919848077775','+919848077775','events@siddhivinayaka.in','https://images.unsplash.com/photo-1519741497674-611481863552?w=150&auto=format&fit=crop&q=80','https://images.unsplash.com/photo-1519741497674-611481863552?w=800&auto=format&fit=crop&q=80','APPROVED',1,'2026-10-30 08:08:25',1,4.80,94,172,'2026-10-30 08:08:25','2026-10-30 08:08:25'),('biz-siri-dental','Siri Dental Clinic','Siri Multispeciality Dental Healthcare Pvt Ltd','siri-dental-clinic','Advanced painless laser dentistry, invisible aligners, computerized root canals, and cosmetic dental surgery by renowned specialists.','+919848033333','+919848033333','care@siridental.in','https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=150&auto=format&fit=crop&q=80','https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=800&auto=format&fit=crop&q=80','APPROVED',1,'2026-11-02 12:54:09',1,4.80,132,147,'2026-11-02 12:54:09','2026-10-30 06:14:22'),('biz-sri-lakshmi','Sri Lakshmi Electrical & Plumbing','Sri Lakshmi Technical Works','sri-lakshmi-electrical-plumbing','Certified professional technicians for domestic & industrial house wiring, inverter setups, bathroom fitting and pipe repairs.','+919848055555','+919848055555','lakshmitechnical@hello-hi.in','https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=150&auto=format&fit=crop&q=80','https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&auto=format&fit=crop&q=80','APPROVED',1,'2026-10-30 06:14:22',0,4.90,142,176,'2026-10-30 06:14:22','2026-10-30 06:14:22'),('biz-srinivasa-packers','Srinivasa Packers & Movers','Srinivasa Logistics & Relocations India Ltd','srinivasa-packers-movers','Top-rated packing and moving specialists in Guntur & Vijayawada. Safe household shifting, zero-damage vehicle moving & secure warehousing.','+919848022222','+919848022222','leads@srinivasapackers.in','https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=150&auto=format&fit=crop&q=80','https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80','APPROVED',1,'2026-11-02 12:54:09',1,4.80,89,210,'2026-11-02 12:54:09','2026-10-30 06:14:22'),('biz-tail-waggers','Tail Waggers Pet Boutique & Vet Clinic','Tail Waggers Pet Care LLP','tail-waggers-pet-boutique-clinic','Imported pet food, luxury grooming spa, canine vaccinations, pet dental hygiene, and day boarding facilities.','+919848077780','+919848077780','care@tailwaggers.in','https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=150&auto=format&fit=crop&q=80','https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=800&auto=format&fit=crop&q=80','APPROVED',1,'2026-10-30 08:08:25',1,4.90,67,92,'2026-10-30 08:08:25','2026-10-30 08:08:25'),('biz-urban-decor','Urban Living Modular Kitchens & Furnishings','Urban Living Interiors LLP','urban-living-modular-kitchens','Custom factory-finished acrylic modular kitchens, ergonomic space-saving wardrobes, Italian marble dining tables, and full home 3D interior design.','+919848077773','+919848077773','design@urbanlivinginteriors.in','https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=150&auto=format&fit=crop&q=80','https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=800&auto=format&fit=crop&q=80','APPROVED',1,'2026-10-30 08:08:25',1,4.80,76,135,'2026-10-30 08:08:25','2026-11-02 13:17:01');
/*!40000 ALTER TABLE `businesses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `categories` (
  `id` varchar(64) NOT NULL,
  `parent_id` varchar(64) DEFAULT NULL,
  `name` varchar(150) NOT NULL,
  `slug` varchar(150) NOT NULL,
  `icon_name` varchar(100) DEFAULT NULL,
  `meta_title` varchar(255) DEFAULT NULL,
  `meta_description` text DEFAULT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `idx_cat_slug` (`slug`),
  KEY `idx_cat_parent` (`parent_id`),
  CONSTRAINT `fk_cat_parent` FOREIGN KEY (`parent_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES ('cat-ask-astro',NULL,'Ask Astro','ask-astro','Sparkle','Vedic Astrologers & Vastu Consultants','Horoscope matching, Vastu dosha remedies and muhurtham dates',5,1),('cat-beauty-spa',NULL,'Beauty Spa','beauty-spa','Sparkles','Salons, Luxury Spas & Wellness','Bridal makeovers, Swedish massages, skin brightening and parlours',3,1),('cat-contractors',NULL,'Contractors','contractors','HardHat','Civil Building Contractors','Licensed civil contractors, waterproofing, electrical and borewells',10,1),('cat-dental',NULL,'Dental Care & Clinics','dental-care','SmilePlus','Dental Clinics & Dentists','Expert dentists, root canal, dental implants and braces',17,1),('cat-dentists',NULL,'Dentists','dentists','SmilePlus','Certified Dentists & Laser Dental','Orthodontists, single-sitting root canals and invisible aligners',14,1),('cat-doctors',NULL,'Doctors & Clinics','doctors-clinics','Stethoscope','Top Doctors & Medical Clinics','Find verified doctors, general physicians and pediatricians',16,1),('cat-education',NULL,'Education','education','GraduationCap','Coaching Institutes & Academies','Top CBSE schools, NEET/IIT coaching academies and tutoring',7,1),('cat-electric',NULL,'Electrical & Plumbing','electrical-plumbing','Zap','Electricians & Plumbers','Emergency electricians, wiring, pipe leakage and sanitary works',21,1),('cat-estate-agent',NULL,'Estate Agent','estate-agent','Building2','Real Estate Brokers & CRDA Plots','Find apartments, commercial office spaces and open plots',13,1),('cat-food',NULL,'Restaurants & Dining','restaurants-food','UtensilsCrossed','Best Restaurants & Food in AP','Discover authentic dining, biryani, family restaurants and cafes',15,1),('cat-home',NULL,'Home Services','home-services','Home','Reliable Home Maintenance & Services','Deep cleaning, painting, carpentry and pest control',19,1),('cat-home-decor',NULL,'Home Decor','home-decor','Armchair','Interior Designers & Modular Kitchens','Custom furniture, false ceiling contractors and modular wardrobes',4,1),('cat-hospitals',NULL,'Hospitals','hospitals','Hospital','Multispeciality Hospitals & Trauma','24/7 emergency casualty, cardiology, orthopedic surgery and ICU',9,1),('cat-hotels',NULL,'Hotels','hotels','Hotel','Luxury & Budget Hotels & Lodges','Book 3-star, 4-star, business suites, and AC lodges',2,1),('cat-movers',NULL,'Packers & Movers','packers-movers','Truck','Verified Packers & Movers','Household shifting, office relocation and transport services',18,1),('cat-pet-shops',NULL,'Pet Shops','pet-shops','PawPrint','Pet Shops & Veterinary Clinics','Dog/cat food, pet accessories, veterinary clinics and spa grooming',11,1),('cat-pg-hostels',NULL,'PG/Hostels','pg-hostels','Bed','Men, Women & Executive PGs','Paying guest accommodations with South Indian food and AC rooms',12,1),('cat-rent-hire',NULL,'Rent & Hire','rent-hire','Key','Equipment Rentals & Self-Drive Cars','Rent self-drive cars, tempo travellers, audio systems and generators',8,1),('cat-restaurants',NULL,'Restaurants','restaurants','UtensilsCrossed','Best Restaurants & Food in AP','Discover authentic dining, biryani, family restaurants and cafes',1,1),('cat-tours',NULL,'Tours & Travel','tours-travel','Plane','Travel Agencies & Car Rentals','Outstation cabs, tourism packages, airport taxi and buses',20,1),('cat-wedding-planning',NULL,'Wedding Planning','wedding-planning','HeartHandshake','Wedding Planners & Kalyana Mandapams','Convention halls, flower decor, photographers and royal catering',6,1);
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cities`
--

DROP TABLE IF EXISTS `cities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cities` (
  `id` varchar(64) NOT NULL,
  `district_id` varchar(64) NOT NULL,
  `name` varchar(100) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `latitude` decimal(10,7) NOT NULL,
  `longitude` decimal(10,7) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `idx_city_slug` (`slug`),
  KEY `idx_city_dist` (`district_id`),
  CONSTRAINT `fk_city_district` FOREIGN KEY (`district_id`) REFERENCES `districts` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cities`
--

LOCK TABLES `cities` WRITE;
/*!40000 ALTER TABLE `cities` DISABLE KEYS */;
INSERT INTO `cities` VALUES ('city-gun','dist-guntur','Guntur','guntur',16.3067000,80.4365000,1),('city-hyd','dist-hyd','Hyderabad','hyderabad',17.3850000,78.4867000,1),('city-vja','dist-krishna','Vijayawada','vijayawada',16.5062000,80.6480000,1);
/*!40000 ALTER TABLE `cities` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `curated_collections`
--

DROP TABLE IF EXISTS `curated_collections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `curated_collections` (
  `id` varchar(64) NOT NULL,
  `category_id` varchar(64) NOT NULL,
  `title` varchar(150) NOT NULL,
  `slug` varchar(150) NOT NULL,
  `badge_label` varchar(50) DEFAULT NULL,
  `cover_image` text DEFAULT NULL,
  `places_count` int(11) NOT NULL DEFAULT 0,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `idx_col_cat` (`category_id`),
  CONSTRAINT `fk_col_cat` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `curated_collections`
--

LOCK TABLES `curated_collections` WRITE;
/*!40000 ALTER TABLE `curated_collections` DISABLE KEYS */;
INSERT INTO `curated_collections` VALUES ('col-dent-1','cat-dental','Painless Laser Root Canals','laser-root-canals','TOP RATED','https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=500&auto=format&fit=crop&q=80',7,1,1),('col-dent-2','cat-dental','Clear Aligners & Braces','clear-aligners-braces','COSMETIC','https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=500&auto=format&fit=crop&q=80',5,2,1),('col-elec-1','cat-electric','Emergency 24/7 Electricians','emergency-electricians','30-MIN ARRIVAL','https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=500&auto=format&fit=crop&q=80',8,1,1),('col-food-1','cat-food','Royal Andhra Claypot Biryani','royal-claypot-biryani','MUST TRY','https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=80',8,1,1),('col-food-2','cat-food','Authentic Veg Thali & Meals','veg-thali-meals','FAMILY FAVORITE','https://images.unsplash.com/photo-1610057099431-d73a1c9d2f2f?w=500&auto=format&fit=crop&q=80',6,2,1),('col-mov-1','cat-movers','Zero-Damage Home Shifting','zero-damage-shifting','100% INSURED','https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=500&auto=format&fit=crop&q=80',6,1,1);
/*!40000 ALTER TABLE `curated_collections` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `districts`
--

DROP TABLE IF EXISTS `districts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `districts` (
  `id` varchar(64) NOT NULL,
  `state_id` varchar(64) NOT NULL,
  `name` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_dist_state` (`state_id`),
  CONSTRAINT `fk_dist_state` FOREIGN KEY (`state_id`) REFERENCES `states` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `districts`
--

LOCK TABLES `districts` WRITE;
/*!40000 ALTER TABLE `districts` DISABLE KEYS */;
INSERT INTO `districts` VALUES ('dist-guntur','state-ap','Guntur'),('dist-hyd','state-ts','Hyderabad'),('dist-krishna','state-ap','Krishna');
/*!40000 ALTER TABLE `districts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `enquiries`
--

DROP TABLE IF EXISTS `enquiries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `enquiries` (
  `id` varchar(64) NOT NULL,
  `reference_no` varchar(50) NOT NULL,
  `business_id` varchar(64) NOT NULL,
  `customer_id` varchar(64) NOT NULL,
  `customer_name` varchar(150) NOT NULL,
  `customer_phone` varchar(20) NOT NULL,
  `message` text NOT NULL,
  `status` enum('NEW','CONTACTED','QUOTED','RESOLVED','CLOSED','SPAM') NOT NULL DEFAULT 'NEW',
  `priority` enum('LOW','NORMAL','HIGH','URGENT') NOT NULL DEFAULT 'NORMAL',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `reference_no` (`reference_no`),
  KEY `idx_enq_ref` (`reference_no`),
  KEY `idx_enq_biz` (`business_id`),
  KEY `idx_enq_cust` (`customer_id`),
  KEY `idx_enq_status` (`status`),
  CONSTRAINT `fk_enq_biz` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_enq_cust` FOREIGN KEY (`customer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `enquiries`
--

LOCK TABLES `enquiries` WRITE;
/*!40000 ALTER TABLE `enquiries` DISABLE KEYS */;
INSERT INTO `enquiries` VALUES ('enq-101','ENQ-2026-57295','biz-siri-dental','user-cust-3','Explore Tester','+919848099999','Need dental consultation for clear aligners via Explore website portal','NEW','HIGH','2026-11-02 12:54:09','2026-10-30 07:18:26'),('enq-102','ENQ-2026-48210','biz-amravati','user-cust-2','Kavitha Rao','+919848077777','Need table reservation for 12 guests this Sunday for Andhra Bhojanam','CONTACTED','NORMAL','2026-11-02 12:54:09','2026-11-02 12:54:09'),('enq-103','ENQ-2026-31908','biz-srinivasa-packers','user-cust-1','Ravi Teja','+919848012345','Looking for 2-BHK house shifting quote from Benz Circle to Hyderabad next week','RESOLVED','HIGH','2026-11-02 12:54:09','2026-11-02 12:54:09'),('enq-8c5f5c80-610d-4798-ba19-c7efb3617a9f','ENQ-2026-42447','biz-amravati','usr_3a6223ce-5254-4b6d-9fbd-195a527eecec','Kavitha Rao','+919848077777','Need table reservation for 12 guests . [Preferred Channel: WHATSAPP] . [Budget Estimate: ?2,000 - ?5,000] . [Timing Preference: Today Evening]','NEW','HIGH','2026-10-30 07:51:26','2026-10-30 07:51:26'),('enq-f7930be0-06b3-40f4-9869-2c19225ab0e5','ENQ-2026-29774','biz-siri-dental','usr_3a6223ce-5254-4b6d-9fbd-195a527eecec','Kavitha Rao','+919848077777','Interested in invisible aligners consultation for tomorrow evening.','NEW','NORMAL','2026-10-30 06:14:58','2026-10-30 06:14:58');
/*!40000 ALTER TABLE `enquiries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `enquiry_events`
--

DROP TABLE IF EXISTS `enquiry_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `enquiry_events` (
  `id` varchar(64) NOT NULL,
  `enquiry_id` varchar(64) NOT NULL,
  `actor_user_id` varchar(64) DEFAULT NULL,
  `previous_status` varchar(50) DEFAULT NULL,
  `new_status` varchar(50) NOT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_event_enq` (`enquiry_id`),
  CONSTRAINT `fk_event_enq` FOREIGN KEY (`enquiry_id`) REFERENCES `enquiries` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `enquiry_events`
--

LOCK TABLES `enquiry_events` WRITE;
/*!40000 ALTER TABLE `enquiry_events` DISABLE KEYS */;
/*!40000 ALTER TABLE `enquiry_events` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `localities`
--

DROP TABLE IF EXISTS `localities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `localities` (
  `id` varchar(64) NOT NULL,
  `city_id` varchar(64) NOT NULL,
  `name` varchar(150) NOT NULL,
  `slug` varchar(150) NOT NULL,
  `pincode` varchar(10) DEFAULT NULL,
  `latitude` decimal(10,7) NOT NULL,
  `longitude` decimal(10,7) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `idx_loc_city_slug` (`city_id`,`slug`),
  KEY `idx_loc_pincode` (`pincode`),
  CONSTRAINT `fk_loc_city` FOREIGN KEY (`city_id`) REFERENCES `cities` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `localities`
--

LOCK TABLES `localities` WRITE;
/*!40000 ALTER TABLE `localities` DISABLE KEYS */;
INSERT INTO `localities` VALUES ('loc_ameerpet','city-hyd','Ameerpet','ameerpet','500016',17.3950000,78.4967000,1),('loc_governorpet','city-vja','Governorpet','governorpet','520002',16.5162000,80.6580000,1),('loc_kanuru','city-vja','Kanuru','kanuru','520007',16.5162000,80.6580000,1),('loc_labbipet','city-vja','Labbipet','labbipet','520010',16.5162000,80.6580000,1),('loc_mg-road','city-vja','MG Road','mg-road','520002',16.5162000,80.6580000,1),('loc_moghalrajpuram','city-vja','Moghalrajpuram','moghalrajpuram','520010',16.5162000,80.6580000,1),('loc_rtc-cross-roads','city-hyd','RTC Cross Roads','rtc-cross-roads','500020',17.3950000,78.4967000,1),('loc-arundelpet','city-gun','Arundelpet','arundelpet','522002',16.3120000,80.4320000,1),('loc-banjara','city-hyd','Banjara Hills','banjara-hills','500034',17.4156000,78.4357000,1),('loc-begumpet','city-hyd','Begumpet','begumpet','500016',17.4447000,78.4664000,1),('loc-benz','city-vja','Benz Circle','benz-circle','520010',16.5015000,80.6430000,1),('loc-brodipet','city-gun','Brodipet','brodipet','522002',16.3050000,80.4380000,1),('loc-gachibowli','city-hyd','Gachibowli','gachibowli','500032',17.4401000,78.3489000,1),('loc-hitec','city-hyd','Hitec City','hitec-city','500081',17.4435000,78.3772000,1),('loc-jubilee','city-hyd','Jubilee Hills','jubilee-hills','500033',17.4319000,78.4073000,1),('loc-kondapur','city-hyd','Kondapur','kondapur','500084',17.4699000,78.3578000,1),('loc-kukatpally','city-hyd','Kukatpally','kukatpally','500072',17.4933000,78.3995000,1),('loc-lakshmipuram','city-gun','Lakshmipuram','lakshmipuram','522007',16.3210000,80.4410000,1),('loc-madhapur','city-hyd','Madhapur','madhapur','500081',17.4483000,78.3915000,1),('loc-nahamar','city-vja','Nahamar','nahamar','520008',16.5120000,80.6515000,1),('loc-onetown','city-vja','One Town','one-town','520001',16.5180000,80.6190000,1),('loc-secunderabad','city-hyd','Secunderabad','secunderabad','500003',17.4399000,78.4983000,1);
/*!40000 ALTER TABLE `localities` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `otp_challenges`
--

DROP TABLE IF EXISTS `otp_challenges`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `otp_challenges` (
  `id` varchar(64) NOT NULL,
  `phone_number` varchar(20) NOT NULL,
  `otp_code_hash` varchar(255) NOT NULL,
  `attempts_count` int(11) NOT NULL DEFAULT 0,
  `purpose` enum('LOGIN','REGISTER','VERIFY_PHONE','CLAIM_BIZ') NOT NULL DEFAULT 'LOGIN',
  `expires_at` datetime NOT NULL,
  `verified_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_otp_phone` (`phone_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `otp_challenges`
--

LOCK TABLES `otp_challenges` WRITE;
/*!40000 ALTER TABLE `otp_challenges` DISABLE KEYS */;
INSERT INTO `otp_challenges` VALUES ('chl_bda795be-d8ee-4565-9073-cc28e9224366','+919876543210','3cfc7d8eab9668c98db625962f0933f3523bcf0a4ab62221ef7ef432e77db828',0,'LOGIN','2026-11-02 07:43:58','2026-11-02 07:38:58','2026-11-02 07:38:58');
/*!40000 ALTER TABLE `otp_challenges` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reviews`
--

DROP TABLE IF EXISTS `reviews`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `reviews` (
  `id` varchar(64) NOT NULL,
  `business_id` varchar(64) NOT NULL,
  `user_id` varchar(64) NOT NULL,
  `rating` tinyint(4) NOT NULL COMMENT '1 to 5 stars',
  `review_text` text DEFAULT NULL,
  `owner_reply` text DEFAULT NULL,
  `status` enum('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'APPROVED',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_rev_biz` (`business_id`),
  KEY `idx_rev_user` (`user_id`),
  CONSTRAINT `fk_rev_biz` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rev_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reviews`
--

LOCK TABLES `reviews` WRITE;
/*!40000 ALTER TABLE `reviews` DISABLE KEYS */;
INSERT INTO `reviews` VALUES ('rev-1','biz-siri-dental','user-cust-1',5,'Dr. Siri Vardhan did my root canal painlessly in just 45 minutes! Highly recommend Siri Dental Clinic.','Thank you Ravi garu! Glad you had a comfortable treatment.','APPROVED','2026-11-02 12:54:09','2026-11-02 12:54:09'),('rev-2','biz-amravati','user-cust-2',5,'Authentic Guntur and Andhra flavours. Claypot biryani and natu kodi pulao are top tier!','Thank you Kavitha garu, looking forward to welcoming your family again!','APPROVED','2026-11-02 12:54:09','2026-11-02 12:54:09');
/*!40000 ALTER TABLE `reviews` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `roles` (
  `id` varchar(64) NOT NULL,
  `name` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES ('role-cust','CUSTOMER','Consumer discovering local businesses and sending leads'),('role-owner','VENDOR_OWNER','Business owner with full rights over business profiles and leads'),('role-staff','VENDOR_STAFF','Business staff managing assigned leads and response workflows'),('role-superadmin','SUPER_ADMIN','Platform root administrative privileges');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `saved_businesses`
--

DROP TABLE IF EXISTS `saved_businesses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `saved_businesses` (
  `id` varchar(64) NOT NULL,
  `user_id` varchar(64) NOT NULL,
  `business_id` varchar(64) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_saved_biz_user` (`user_id`,`business_id`),
  KEY `idx_saved_biz` (`business_id`),
  CONSTRAINT `fk_saved_biz` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_saved_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `saved_businesses`
--

LOCK TABLES `saved_businesses` WRITE;
/*!40000 ALTER TABLE `saved_businesses` DISABLE KEYS */;
/*!40000 ALTER TABLE `saved_businesses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `services`
--

DROP TABLE IF EXISTS `services`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `services` (
  `id` varchar(64) NOT NULL,
  `category_id` varchar(64) NOT NULL,
  `name` varchar(150) NOT NULL,
  `slug` varchar(150) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_srv_cat` (`category_id`),
  CONSTRAINT `fk_srv_cat` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `services`
--

LOCK TABLES `services` WRITE;
/*!40000 ALTER TABLE `services` DISABLE KEYS */;
INSERT INTO `services` VALUES ('srv-1','cat-food','Family Dining','family-dining'),('srv-10','cat-electric','AC Jet Cleaning & Gas Charging','ac-service'),('srv-2','cat-food','Royal Claypot Biryani','royal-claypot-biryani'),('srv-3','cat-food','Authentic Andhra Bhojanam','authentic-andhra-bhojanam'),('srv-4','cat-dental','Laser Root Canal Treatment','laser-root-canal'),('srv-5','cat-dental','Invisible Clear Aligners','invisible-clear-aligners'),('srv-6','cat-dental','Dental Implants','dental-implants'),('srv-7','cat-movers','Household Shifting 100% Insured','household-shifting'),('srv-8','cat-movers','Office Corporate Relocation','office-relocation'),('srv-9','cat-electric','Emergency 24/7 Electrician','emergency-electrician');
/*!40000 ALTER TABLE `services` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `states`
--

DROP TABLE IF EXISTS `states`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `states` (
  `id` varchar(64) NOT NULL,
  `name` varchar(100) NOT NULL,
  `code` varchar(10) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `states`
--

LOCK TABLES `states` WRITE;
/*!40000 ALTER TABLE `states` DISABLE KEYS */;
INSERT INTO `states` VALUES ('state-ap','Andhra Pradesh','AP',1),('state-ts','Telangana','TS',1);
/*!40000 ALTER TABLE `states` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_permissions`
--

DROP TABLE IF EXISTS `user_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_permissions` (
  `id` varchar(64) NOT NULL,
  `user_id` varchar(64) NOT NULL,
  `role_id` varchar(64) NOT NULL,
  `resource_id` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_perm_user` (`user_id`),
  KEY `idx_perm_role` (`role_id`),
  CONSTRAINT `fk_perm_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_perm_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_permissions`
--

LOCK TABLES `user_permissions` WRITE;
/*!40000 ALTER TABLE `user_permissions` DISABLE KEYS */;
INSERT INTO `user_permissions` VALUES ('perm_40761423-9fda-40aa-8ec7-92d73fe8f7bc','usr_b33f33ab-7845-4558-8e23-04f505eff2c7','role-cust',NULL),('perm-admin-1','user-admin-1','role-superadmin',NULL),('perm-cust-1','user-cust-1','role-cust',NULL),('perm-cust-2','user-cust-2','role-cust',NULL),('perm-cust-3','user-cust-3','role-cust',NULL),('perm-vendor-1','user-vendor-1','role-owner',NULL),('perm-vendor-2','user-vendor-2','role-owner',NULL),('perm-vendor-3','user-vendor-3','role-owner',NULL),('perm-vendor-4','user-vendor-4','role-owner',NULL),('perm-vendor-5','user-vendor-5','role-owner',NULL);
/*!40000 ALTER TABLE `user_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_sessions`
--

DROP TABLE IF EXISTS `user_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_sessions` (
  `id` varchar(64) NOT NULL,
  `user_id` varchar(64) NOT NULL,
  `refresh_token_hash` varchar(255) NOT NULL,
  `device_info` varchar(255) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `expires_at` datetime NOT NULL,
  `revoked_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_session_user` (`user_id`),
  CONSTRAINT `fk_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_sessions`
--

LOCK TABLES `user_sessions` WRITE;
/*!40000 ALTER TABLE `user_sessions` DISABLE KEYS */;
INSERT INTO `user_sessions` VALUES ('sess_5d57db37-40ad-4faa-b017-99662ec0a716','usr_b33f33ab-7845-4558-8e23-04f505eff2c7','4878bac997ae96cadb3641210cf7710b382f2914a3115d6a054d89bc56d467a3','Browser / App','::1','2026-12-02 07:38:58',NULL,'2026-11-02 07:38:58');
/*!40000 ALTER TABLE `user_sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `id` varchar(64) NOT NULL,
  `phone_number` varchar(20) NOT NULL,
  `full_name` varchar(150) DEFAULT NULL,
  `email` varchar(191) DEFAULT NULL,
  `avatar_url` text DEFAULT NULL,
  `status` enum('ACTIVE','SUSPENDED','DELETED') NOT NULL DEFAULT 'ACTIVE',
  `phone_verified_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `phone_number` (`phone_number`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES ('user-admin-1','+919848000001','Admin User','admin@hello-hi.in',NULL,'ACTIVE','2026-11-02 12:54:09','2026-11-02 12:54:09','2026-10-31 11:14:04'),('user-cust-1','+919848012345','Ravi Teja','ravi.teja@gmail.com',NULL,'ACTIVE','2026-11-02 12:54:09','2026-11-02 12:54:09','2026-11-02 12:54:09'),('user-cust-2','+919848077777',NULL,NULL,NULL,'ACTIVE','2026-11-02 12:54:09','2026-11-02 12:54:09','2026-10-30 05:57:12'),('user-cust-3','+919848099999','Ramesh Kumar (Pilot Partner)','ramesh.kumar@hello-hi.in',NULL,'ACTIVE','2026-11-02 12:54:09','2026-11-02 12:54:09','2026-10-30 06:14:22'),('user-vendor-1','+919848011111','Suresh Varma (Amravati Grand)','suresh.varma@amravatigrand.in',NULL,'ACTIVE','2026-11-02 12:54:09','2026-11-02 12:54:09','2026-11-02 12:54:09'),('user-vendor-2','+919848022222','Rao Srinivasa (Packers & Movers)','contact@srinivasapackers.in',NULL,'ACTIVE','2026-11-02 12:54:09','2026-11-02 12:54:09','2026-11-02 12:54:09'),('user-vendor-3','+919848033333','Dr. Siri Vardhan (Siri Dental)','dr.siri@siridental.in',NULL,'ACTIVE','2026-11-02 12:54:09','2026-11-02 12:54:09','2026-11-02 12:54:09'),('user-vendor-4','+919848044444','Dr. Fernat Reddy (Fernat Dental)','dr.fernat@fernatdental.in',NULL,'ACTIVE','2026-11-02 12:54:09','2026-11-02 12:54:09','2026-11-02 12:54:09'),('user-vendor-5','+919848055555','Bawarchi Royal Foods','manager@bawarchiroyal.in',NULL,'ACTIVE','2026-11-02 12:54:09','2026-11-02 12:54:09','2026-11-02 12:54:09'),('usr_2638ee33-45c5-455e-bcb5-256e4d1454ea','+919949779073','nani','nani@gmail.com',NULL,'ACTIVE','2026-11-02 07:05:51','2026-11-02 07:05:51','2026-11-02 07:10:03'),('usr_92bab839-3009-417b-924f-6613092d9be8','+919848099881','Srikanth Reddy','srikanth@hello.test',NULL,'ACTIVE','2026-11-02 06:19:03','2026-11-02 06:19:03','2026-11-02 06:19:03'),('usr_b33f33ab-7845-4558-8e23-04f505eff2c7','+919876543210',NULL,NULL,NULL,'ACTIVE','2026-11-02 07:38:58','2026-11-02 07:38:58','2026-11-02 07:38:58'),('usr_c61f0596-74ce-41cc-a607-f93989370bb4','+919848077889','Anand Verma','anand.verma@hello.test',NULL,'ACTIVE','2026-11-02 06:20:23','2026-11-02 06:20:23','2026-11-02 06:20:23');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-02 13:59:02
