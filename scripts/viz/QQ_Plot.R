#!/usr/bin/rscript
args <- commandArgs(trailingOnly = TRUE);

chartDocument_id = args[0];
flags            = args[1];
infilename       = args[2];
outputviz        = args[3];
outputdata       = args[4];

svg(outputviz);

infile = read.delim(infilename, header=TRUE, sep="\t", row.names=1, na.strings="N/A", stringsAsFactors=TRUE);
n_infile = dim(infile)[1];

input = na.omit(infile)
input1 = unlist(input[1]);
n_input = length(input1);

n_cols = dim(input)[2];


cn = colnames(input)

cat(n_input, "of", n_infile , "have useful values");

if (n_cols == 1) {
    data = unlist(input[1]);
    qqnorm(data)
    qqline(data)
} else {
    qqplot(unlist(input[1]), unlist(input[2]), xlab=cn[1], ylab=cn[2])
    qqline(unlist(input[1]))
    qqline(unlist(input[2]))
}

ignore = dev.off();
