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
data2 = unlist(input[2]);
cn = colnames(input)


dat<-data.frame(x=data,y=data2)
attach(dat)
plot(x,y,xlab=cn[1],ylab=cn[2]) 
abline(lm(y~x));

ct = cor.test(x,y);

t_statistic = ct[1];
df = ct[2];
pvalue = sprintf("%.3f", ct[3])
pearsons_r = sprintf("%.3f", ct[4])
sided = ct[6]
test = ct[7];

stats = paste(test, " ", sided, " Pearsons R=", pearsons_r, " P-Value=", pvalue, sep='');
write(stats, outputdata);
