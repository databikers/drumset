# Change Log

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

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
