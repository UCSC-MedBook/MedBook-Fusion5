#!/usr/bin/Rscript
args <- commandArgs(trailingOnly = TRUE);

chartDocument_id = args[0];
flags            = args[1];
infilename       = args[2];
outputviz        = args[3];
outputdata       = args[4];

svg(outputviz);

input = read.delim(infilename, header=TRUE, sep="\t", row.names=1, na.strings="N/A", stringsAsFactors=TRUE);
input = na.omit(input)
data = unlist(input[1]);
xlab = colnames(input)
xlab = xlab[1]
cat(xlab)

hist(data, xlab=xlab)

ignore = dev.off();

