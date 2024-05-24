-- --------------------------------------------------------
-- 호스트:                          localhost
-- 서버 버전:                        5.7.32 - MySQL Community Server (GPL)
-- 서버 OS:                        Linux
-- HeidiSQL 버전:                  11.1.0.6116
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


-- ceik 데이터베이스 구조 내보내기
CREATE DATABASE IF NOT EXISTS `ceik` /*!40100 DEFAULT CHARACTER SET utf8 COLLATE utf8_unicode_ci */;
USE `ceik`;

-- 테이블 ceik.mininglog 구조 내보내기
CREATE TABLE IF NOT EXISTS `mininglog` (
  `midx` bigint(20) NOT NULL AUTO_INCREMENT,
  `userIdx` int(11) NOT NULL,
  `aah_balance` varchar(40) COLLATE utf8_unicode_ci DEFAULT '0',
  `regdate` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `regip` varchar(15) COLLATE utf8_unicode_ci DEFAULT '',
  `memo` varchar(250) COLLATE utf8_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`midx`) USING BTREE,
  KEY `userIdx` (`userIdx`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- 내보낼 데이터가 선택되어 있지 않습니다.

-- 테이블 ceik.parties 구조 내보내기
CREATE TABLE IF NOT EXISTS `parties` (
  `idx` int(11) NOT NULL AUTO_INCREMENT,
  `partyName` varchar(100) COLLATE utf8_unicode_ci NOT NULL,
  `userIdx` int(11) NOT NULL COMMENT 'partyAdmin',
  `regdate` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `modidate` datetime DEFAULT CURRENT_TIMESTAMP,
  `regip` varchar(15) COLLATE utf8_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`idx`) USING BTREE,
  UNIQUE KEY `partyName` (`partyName`),
  UNIQUE KEY `userIdx` (`userIdx`),
  CONSTRAINT `parties_ibfk_1` FOREIGN KEY (`userIdx`) REFERENCES `users` (`userIdx`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- 내보낼 데이터가 선택되어 있지 않습니다.

-- 테이블 ceik.party_member 구조 내보내기
CREATE TABLE IF NOT EXISTS `party_member` (
  `idx` int(11) NOT NULL AUTO_INCREMENT,
  `party_idx` int(11) NOT NULL,
  `user_idx` int(11) NOT NULL,
  `regdate` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `regip` varchar(16) COLLATE utf8_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`idx`),
  UNIQUE KEY `user_idx` (`user_idx`),
  KEY `party_idx` (`party_idx`),
  CONSTRAINT `party_member_ibfk_1` FOREIGN KEY (`party_idx`) REFERENCES `parties` (`idx`),
  CONSTRAINT `party_member_ibfk_2` FOREIGN KEY (`user_idx`) REFERENCES `users` (`userIdx`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- 내보낼 데이터가 선택되어 있지 않습니다.

-- 테이블 ceik.pointlog 구조 내보내기
CREATE TABLE IF NOT EXISTS `pointlog` (
  `pidx` bigint(20) NOT NULL AUTO_INCREMENT,
  `userIdx` int(11) NOT NULL,
  `point` int(11) NOT NULL DEFAULT '0',
  `regdate` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `regip` varchar(15) COLLATE utf8_unicode_ci DEFAULT '',
  `memo` varchar(250) COLLATE utf8_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`pidx`) USING BTREE,
  KEY `userIdx` (`userIdx`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- 내보낼 데이터가 선택되어 있지 않습니다.

-- 테이블 ceik.sendlog 구조 내보내기
CREATE TABLE IF NOT EXISTS `sendlog` (
  `tidx` bigint(20) NOT NULL AUTO_INCREMENT,
  `userIdx` bigint(20) DEFAULT NULL,
  `fromAddr` varchar(67) COLLATE utf8_unicode_ci NOT NULL,
  `fromAmt` varchar(37) COLLATE utf8_unicode_ci NOT NULL,
  `toAddr` varchar(67) COLLATE utf8_unicode_ci NOT NULL,
  `toAmt` varchar(37) COLLATE utf8_unicode_ci DEFAULT NULL,
  `regdate` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `regip` varchar(15) COLLATE utf8_unicode_ci DEFAULT '',
  `blockNumber` bigint(20) DEFAULT '0',
  `contractAddress` varchar(67) COLLATE utf8_unicode_ci DEFAULT NULL,
  `blockHash` varchar(67) COLLATE utf8_unicode_ci DEFAULT NULL,
  `transactionHash` varchar(67) COLLATE utf8_unicode_ci DEFAULT NULL,
  `last_reg` datetime DEFAULT NULL,
  `memo` varchar(250) COLLATE utf8_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`tidx`) USING BTREE,
  KEY `idxAddr` (`fromAddr`,`toAddr`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- 내보낼 데이터가 선택되어 있지 않습니다.

-- 테이블 ceik.users 구조 내보내기
CREATE TABLE IF NOT EXISTS `users` (
  `userIdx` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(150) COLLATE utf8_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `reqAAH_ingYN` varchar(1) COLLATE utf8_unicode_ci NOT NULL DEFAULT 'N',
  `loginCnt` bigint(20) NOT NULL DEFAULT '0',
  `loginDailyCnt` int(11) NOT NULL DEFAULT '0' COMMENT 'loginCntPerDay+1',
  `logindate` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `loginDailydate` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `pub_key` varchar(63) COLLATE utf8_unicode_ci DEFAULT NULL,
  `pri_key` varchar(250) COLLATE utf8_unicode_ci DEFAULT NULL,
  `seed` varchar(250) COLLATE utf8_unicode_ci DEFAULT NULL,
  `aah_balance` varchar(40) COLLATE utf8_unicode_ci DEFAULT '0' COMMENT 'AAH QTY PRE MIINING',
  `aah_real_balance` varchar(40) COLLATE utf8_unicode_ci DEFAULT '0' COMMENT 'AAH QTY REAL',
  `regip` varchar(30) COLLATE utf8_unicode_ci DEFAULT NULL,
  `regdate` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_reg` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_ip` varchar(30) COLLATE utf8_unicode_ci DEFAULT NULL,
  `point` bigint(20) NOT NULL DEFAULT '100',
  `google_id` varchar(60) COLLATE utf8_unicode_ci NOT NULL DEFAULT '0',
  `google_token` varchar(300) COLLATE utf8_unicode_ci DEFAULT NULL,
  `reffer_id` int(11) DEFAULT '0',
  `reffer_cnt` int(11) DEFAULT '0',
  `user_add_addr` varchar(63) COLLATE utf8_unicode_ci DEFAULT '',
  PRIMARY KEY (`email`) USING BTREE,
  UNIQUE KEY `userIdx` (`userIdx`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- 내보낼 데이터가 선택되어 있지 않습니다.

/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IF(@OLD_FOREIGN_KEY_CHECKS IS NULL, 1, @OLD_FOREIGN_KEY_CHECKS) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;




alter TABLE boosters ADD COLUMN `regdate` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
alter TABLE boosters ADD COLUMN `regip` VARCHAR(15) NULL DEFAULT '' COLLATE 'utf8_unicode_ci'
alter TABLE boosters ADD COLUMN `memo` VARCHAR(250) NULL DEFAULT NULL COLLATE 'utf8_unicode_ci'
