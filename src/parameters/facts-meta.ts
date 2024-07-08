import { FactsMetaKeys } from '@const';

export type FactsMeta<Nodes> = Record<Nodes, Record<FactsMetaKeys, number>>;
