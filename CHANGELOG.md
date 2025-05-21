# Change Log

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## [3.2.0] - 2025-05-21

### fixed

- Fixed timeout between retries


## [3.1.3] - 2025-05-03

### fixed

- Fixed retrying beyond the catch block (queue-processor)

## [3.1.2] - 2025-05-03

### fixed

- Fixed graph schema in README.md

## [3.1.1] - 2025-04-29

### Added

- Added optional **error** argument for node executor

## [3.1.0] - 2025-04-25

### Added

- Added keeping execution after the reaching of the pivot point

### Fixed

- Fixed result returning from Saga.process;
- Fixed running of compensator;
- Fixed issue when exit called multiple times;

## [3.0.4] - 2025-04-24

### Fixed

- Fixed ExecutorNextFunction contract: allow NodeName[] as proper arg for next();
- Removed **lastRetryTime** from NodeMeta;

## [3.0.3] - 2025-04-24

### Fixed

- Fixed export: added FactsMetaContract, NodeMeta, and Scaling contracts;
- Removed **lastRetryTime** from NodeMeta;

## [3.0.2] - 2025-04-23

### Fixed

- Fixed README.md: wrong argument definition scalingFactor (line 27)

## [3.0.1] - 2025-04-23 (Breaking changes!)

### Added

- Added ReturnType for **saga.process** method

### Fixed

- **Changed response of the saga.process method from the Promise<Facts<DataType, NodeName> to the Promise<DataType>**

---

## [3.0.0] - 2025-04-21 (Breaking changes!)

### Added

- Added the ability to run in parallel on multiple nodes (&beta;)
- Added **rollbackWhenSuccessNode** to NodeMeta and FactsMeta contracts
- Added **runAfterNodesSucceed** property to NodeMeta and FactsMeta contracts
- Added optional **factsMeta** argument for the **saga.process** method
- Added **expiresAfter** property to the optional factsMeta argument for the **saga.process** method
- Added **executeAfter** property to the optional factsMeta argument for the **saga.process** method
- Replaced **compensatorNode** with **rollbackWhenErrorNode** in NodeMeta and FactsMeta contracts

---

## [2.3.0] - 2025-04-14

### Added

- Added middlewares

## [2.2.0] - 2024-09-04

### Added

- pseudoInterval helper added to export
- Added separated types for next, exit, retry executor arguments

## [2.1.0] - 2024-08-24

### Fixed

- Made own retries count for each node since it's more clear and correct

## [2.0.0] - 2024-08-23

### Added

- Dynamic horizontal scaling for Nodes in Graph (Saga) instead of static scaling
- Verbose mode made working, added logs
- Added saga.state() method to display the saga current state/loads

### Changed

- saga.addNode 4-th argument changed form number to object implements Scaling
