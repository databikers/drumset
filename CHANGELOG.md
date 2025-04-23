# Change Log

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

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
