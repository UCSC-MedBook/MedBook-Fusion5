#!/usr/bin/rscript
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
data2 = unlist(input[2]);
cn = colnames(input)
xlab = cn[1]
ylab = cn[2]

plot(data, data2, xlab=xlab, ylab=ylab)

ignore = dev.off();

