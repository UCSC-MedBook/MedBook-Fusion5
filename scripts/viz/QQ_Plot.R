#!/usr/bin/rscript
args <- commandArgs(trailingOnly = TRUE);
cat("Histogram", args);
svg("plot.svg", width=8, height=6);
input = read.table("input",header=TRUE, sep="\t")
qqplot(input[2], input[3])
dev.off();
