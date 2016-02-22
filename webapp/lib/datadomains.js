

// The most important data domains: the ones which are indexed by gene (or gene-like) names.
GeneLikeDataDomainsPrototype = [
    {
        type: 2,
        label: "Expression Quant",
        labelItem: "ExprQuant",
        checkBoxName: "ExprQuantCheckbox",
        dataName: "GeneExpression",
        collection: "GeneExpression",
        subscriptionName: "GeneExpression",
        queryField: 'gene_label',
        field: 'values.quantile_counts_log',
        state: false,
        study_label_name: 'study_label',
        sample_label_name: 'sample_label',
        gene_label_name: 'gene_label',
	index: {   gene_label : 1, sample_label: 1, study_label : 1 },
    },
    {
        type: 1,
        label: "Expression RSEM",
        labelItem: "ExprRSEM",
        checkBoxName: "ExprCheckbox",
        dataName: "Expression",
        collection: "Expression",
        subscriptionName: "GeneExpression",
        queryField: 'gene',
        field: "rsem_quan_log2",
        state: false,
        study_label_name: 'Study_ID',
        sample_label_name: 'Sample_ID',
        gene_label_name: 'gene',
	index: { "gene" : 1, "studies" : 1 },
    },
    {
        type: 1,
        label: "Isoform RSEM",
        labelItem: "IsoformRSEM",
        checkBoxName: "IsoformCheckbox",
        dataName: "ExpressionIsoform",
        collection: "ExpressionIsoform",
        subscriptionName: "GeneExpressionIsoform",
        queryField: 'gene',
        field: "rsem_quan_log2",
        state: false,
        study_label_name: 'studyID',
        sample_label_name: 'Sample_ID',
        gene_label_name: 'gene',
        index: { "gene" : 1, "studies" : 1 , "transcript" : 1},
    },
    {
        type: 2,
        label: "Mutations",
        labelItem: "Mut",
        checkBoxName: "MutCheckbox",
        dataName: "Mutations",
        collection: "Mutations",
        subscriptionName: "GeneMutations",
        queryField: 'Hugo_Symbol',
        field: "Variant_Type",
        state: false,
        study_label_name: 'Study_ID',
        sample_label_name: 'Sample_ID',
        gene_label_name: 'Hugo_Symbol',
	index: { "gene" : 1, "studies" : 1 },
    },
    {
        type: 3,
        regex_genenames: true,
        label: "Pathway Signature (Viper Method)",
        labelItem: "Kinase_Sig",
        checkBoxName: "KinaseViperSignatureCheckbox",
        dataName: "KinaseViperSignature",
        collection: "SignatureScores",
        subscriptionName: "GeneSignatureScores",
        queryField: 'name',
        field: "val",
        state: false,
        study_label_name: null,
        sample_label_name: 'id',
        gene_label_name: 'name',
	index: null,
    },
    /*
    {
        type: 3,
        regex_genenames: true,
        label: "Transcription Factor Pathway Signature (Viper Method)",
        labelItem: "TF_Sig",
        checkBoxName: "TfViperSignatureCheckbox",
        dataName: "TfViperSignature",
        collection: "SignatureScores",
        subscriptionName: "GeneSignatureScores",
        queryField: 'name',
        field: "val",
        state: false,
        study_label_name: null,
        sample_label_name: 'id',
        gene_label_name: 'name',
	index: null,
    },
    {
        type: 3,
        regex_genenames: true,
        label: "Transcription Factor Pathway Signature (Viper Method)",
        labelItem: "TF_Sig",
        checkBoxName: "TfViperSignatureCheckbox",
    },
    */
];


