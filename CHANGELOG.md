# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## [2.0.0](https://github.com/opensumi/di/compare/v1.10.1...v2.0.0) (2024-01-19)


### Features

* add event emitter ([6bb85ec](https://github.com/opensumi/di/commit/6bb85ec3d08f0abb6ecb63b137a0ecd3f02e1b61))
* hooks support priority option ([5f13619](https://github.com/opensumi/di/commit/5f13619eb644fa04ad486c511bcf8a18229dee5c))
* make dispose support disposing instance of useFactory ([#116](https://github.com/opensumi/di/issues/116)) ([4a9e4a3](https://github.com/opensumi/di/commit/4a9e4a345dfd1ece3f67ecca315fb0acba62025c))


### Bug Fixes

* factory instances should save proxied ([dad48a8](https://github.com/opensumi/di/commit/dad48a81f47033e090202667cd4b3fccb9fa8e14))
* factory support multiple value ([edaa25e](https://github.com/opensumi/di/commit/edaa25e85602374642e55948415e3a656035e06a))
* instance should be disposed ([5f09c6a](https://github.com/opensumi/di/commit/5f09c6a17dd79175c14a6a688b06892572699024))
* typo in README-zh_CN ([#120](https://github.com/opensumi/di/issues/120)) ([f41d956](https://github.com/opensumi/di/commit/f41d956b7e08bc613fabbb8ddbc537fd284bef56))
* we should listen on instance disposed ([362196f](https://github.com/opensumi/di/commit/362196f50bb4f8a476b0d8c108dfbdb1455e1d9a))

## [1.10.1](https://github.com/opensumi/di/compare/v1.10.0...v1.10.1) (2023-12-12)


### Bug Fixes

* hooked class will be instantiate multiple times ([#119](https://github.com/opensumi/di/issues/119)) ([924bef9](https://github.com/opensumi/di/commit/924bef9e29e077fdbb6a4362d29398429de1b24e))

## [1.10.0](https://github.com/opensumi/di/compare/v1.9.0...v1.10.0) (2023-11-09)


### Features

* support dispose hooks ([#113](https://github.com/opensumi/di/issues/113)) ([a1e587c](https://github.com/opensumi/di/commit/a1e587c7bdfe2993d61c58d523a69a16d74ce599))


### Bug Fixes

* avoid instance id conflict when have multi injector ([#114](https://github.com/opensumi/di/issues/114)) ([ca3da8c](https://github.com/opensumi/di/commit/ca3da8ccd7891f1d1d2d5f4ca217c93bc650673d))

## [1.9.0](https://github.com/opensumi/di/compare/v1.8.1...v1.9.0) (2023-10-13)


### Features

* injector can get domain from parent ([#108](https://github.com/opensumi/di/issues/108)) ([07d3baf](https://github.com/opensumi/di/commit/07d3baff7f410911af05da1d6f90550b0a49b468))


### Bug Fixes

* dispose should also delete its all instance cache ([#110](https://github.com/opensumi/di/issues/110)) ([cec693b](https://github.com/opensumi/di/commit/cec693b898e8608bb6ec32207beeddbce31ec460))

## [1.8.1](https://github.com/opensumi/di/compare/v1.8.0...v1.8.1) (2023-09-26)


### Bug Fixes

* union model in promise ([#107](https://github.com/opensumi/di/issues/107)) ([015f1e2](https://github.com/opensumi/di/commit/015f1e2562ecc56851c3eb496c101403e6e91324))

## [1.8.0](https://github.com/opensumi/di/compare/v1.7.0...v1.8.0) (2022-08-10)


### Features

* support detect useAlias registration cycle ([#46](https://github.com/opensumi/di/issues/46)) ([7b00e61](https://github.com/opensumi/di/commit/7b00e612639459401f9bc8349f63be16f94466a6))

## [1.7.0](https://github.com/opensumi/di/compare/v1.6.0...v1.7.0) (2022-07-17)


### Features

* support nested useAlias ([7201cc7](https://github.com/opensumi/di/commit/7201cc7bdb18606cbb2a02ad17d5df7099e88471))

## [1.6.0](https://github.com/opensumi/di/compare/v1.6.0-beta.0...v1.6.0) (2022-07-15)

## [1.6.0-beta.0](https://github.com/opensumi/di/compare/v1.5.1...v1.6.0-beta.0) (2022-07-15)


### Features

* annotate the return type of `getFromDomain` ([#41](https://github.com/opensumi/di/issues/41)) ([8ed2853](https://github.com/opensumi/di/commit/8ed2853c3ab17c78574ee316a1f12841b44a0753))
* support detecting circular dependencies ([#38](https://github.com/opensumi/di/issues/38)) ([a44ec02](https://github.com/opensumi/di/commit/a44ec02796481680b732075f1de60d4f1bff9a4c))

## [1.5.0](https://github.com/opensumi/di/compare/v1.4.0...v1.5.0) (2022-06-20)


### Features

* create child by `this.constructor` ([#18](https://github.com/opensumi/di/issues/18)) ([11aab50](https://github.com/opensumi/di/commit/11aab503b6679f0d04e4b288304a1112519afc8a))

## [1.4.0](https://github.com/opensumi/di/compare/v1.4.0-beta.2...v1.4.0) (2022-06-09)

## [1.4.0-beta.2](https://github.com/opensumi/di/compare/v1.4.0-beta.1...v1.4.0-beta.2) (2022-05-30)

## [1.4.0-beta.1](https://github.com/opensumi/di/compare/v1.4.0-beta.0...v1.4.0-beta.1) (2022-05-30)


### Features

* add useAlias ([#17](https://github.com/opensumi/di/issues/17)) ([048c414](https://github.com/opensumi/di/commit/048c4143477e3a4cff92eb971991841dbaec7114))

## [1.4.0-beta.0](https://github.com/opensumi/di/compare/v1.3.1...v1.4.0-beta.0) (2022-05-24)


### Features

* add `asSingleton` factory helper ([#16](https://github.com/opensumi/di/issues/16)) ([40db872](https://github.com/opensumi/di/commit/40db87256f4ddab3f3f62ba35c5d383b6a63b56b))
* support asynchronous dispose ([#15](https://github.com/opensumi/di/issues/15)) ([e26b577](https://github.com/opensumi/di/commit/e26b577f75ccf32ba5a98db9e082da51409b45f5))

### [1.3.1](https://github.com/opensumi/di/compare/v1.3.0...v1.3.1) (2022-05-06)

## 1.3.0 (2022-05-05)

### Features

* support create multiple case by token ([#13](https://github.com/opensumi/di/issues/13)) ([b0217db](https://github.com/opensumi/di/commit/b0217db25ada21299a995755194e9206c00eb59c))

## 1.1.0 (2021-12-14)

### Features

* remove archived api ([239c527](https://github.com/opensumi/di/commit/239c527))
