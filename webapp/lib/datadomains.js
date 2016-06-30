

// The most important data domains: the ones which are indexed by gene (or gene-like) names.
GeneLikeDataDomainsPrototype = [
    {
        format_type: 4,
        label: "Gene Expression RSEM",
        labelItem: "Expr RSEM",
        checkBoxName: "ExprCheckbox4",
        dataName: "GeneExpression",
        collection: "GeneExpression",
        subscriptionName: "GeneExpression",
        queryField: 'gene_label',
        field: "rsem_quan_log2",
        state: true,
        data_set_label_name: 'data_set_id',
        sample_label_name: null,
        gene_label_name: 'gene_label',
	index: { "gene_label" : 1, "data_set_label" : 1 },
	field_type: "Number",
    }
/*
,
    {
        format_type: 2,
        label: "Mutations",
        labelItem: "Mut",
        checkBoxName: "MutCheckbox",
        dataName: "Mutations",
        collection: "Mutations",
        subscriptionName: "GeneMutations",
        queryField: 'Hugo_Symbol',
        field: "mutation_type",
        state: false,

        data_set_label_name: 'data_set_label',
        sample_label_name: 'sample_label',
        gene_label_name: 'gene_label',
        index:{gene_label:1, sample_label:1, data_set_label:1},
	field_type: "String",

    },
    */
];


