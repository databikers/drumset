import { FactsMetaKeys } from '@const';

export type FactsMeta<Nodes extends string> = Record<Nodes, Record<FactsMetaKeys, number>>;
