#!/usr/bin/rscript
library(ggplot2);

input = read.table("input",header=TRUE, sep="\t")

plot = qplot(AR.ExprRSEM, data=input, geom="histogram");
ggsave(file="plot.png", plot=plot, width=10, height=8);

