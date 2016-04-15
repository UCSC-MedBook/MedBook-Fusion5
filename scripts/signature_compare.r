#!/usr/bin/Rscript

#YN version1

#usage, options and doc goes here
argspec <- c("signature_compare.r - takes any two matrices and returns a matrix of comparison (e.g. dot product) results between each column of the first matrix and each column of the second matrix. Requires a single header line and a single cloumn of annotation in both input matrices. Output will be a matrix of columns of the first matrix by columns of the second matrix.
Usage:
    signature_compare.r input1.tab input2.tab dot > output.tab
Example:
	Rscript signature_compare.r test_matrix.tab test_matrix2.tab dot > output_matrix.tab
Options:
	input matrix 1 (annotated by row and column names)
	input matrix 2 (annotated by row and column names)
	type of correlation: dot, pearson, kendall, spearman
	output file is specified through redirect character >")

read_matrix <- function(in_file){
	header <- strsplit(readLines(con=in_file, n=1), "\t")[[1]]
	cl.cols<- 1:length(header) > 1
	data_matrix.df <- read.delim(in_file, header=TRUE, row.names=NULL, stringsAsFactors=FALSE, na.strings="NA", check.names=FALSE)
	data_matrix <- as.matrix(data_matrix.df[,cl.cols])
	rownames(data_matrix) <- data_matrix.df[,1]
	return(data_matrix)
}

write_matrix <- function(data_matrix){
	header <- append(c(""), colnames(data_matrix))
	write.table(t(header), stdout(), quote=FALSE, sep="\t", row.names=FALSE, col.names=FALSE)
	write.table(data_matrix, stdout(), quote=FALSE, sep="\t", row.names=TRUE, col.names=FALSE)
}

dot_two_vectors <- function(lst1, lst2, cmp_type){
	lst1_no_na <- lst1[which(!is.na(lst1))]
	lst2_no_na <- lst2[which(!is.na(lst2))]
	
	lst1_names <- names(lst1_no_na)
	lst2_names <- names(lst2_no_na)
	matched_names <- lst1_names[lst1_names %in% lst2_names]
	
	lst1_selected <- lst1_no_na[names(lst1_no_na) %in% matched_names]
	lst2_selected <- lst2_no_na[names(lst2_no_na) %in% matched_names]
	
	lst1_selected <- lst1_selected[order(names(lst1_selected))]
	lst2_selected <- lst2_selected[order(names(lst2_selected))]
	
	if(cmp_type=="DOT"){
		return(sum(lst1_selected*lst2_selected));
	}
	if(cmp_type=="PEARSON"){
		return(cor(lst1_selected, lst2_selected, method="pearson"));
	}
	if(cmp_type=="SPEARMAN"){
		return(cor(lst1_selected, lst2_selected, method="spearman"));
	}
	if(cmp_type=="KENDALL"){
		return(cor(lst1_selected, lst2_selected, method="kendal"));
	}	
}

dot_two_vectors2 <- function(lst1, lst2, cmp_type){
	if(cmp_type=="DOT"){
		return(sum(lst1*lst2));
	}
	if(cmp_type=="PEARSON"){
		return(cor(lst1, lst2, method="pearson"));
	}
	if(cmp_type=="SPEARMAN"){
		return(cor(lst1, lst2, method="spearman"));
	}
	if(cmp_type=="KENDALL"){
		return(cor(lst1, lst2, method="kendal"));
	}
}

dot_vector_with_matrix <- function(vect, vect_matrix, cmp_type){
	return(apply(vect_matrix, 2, dot_two_vectors, lst2=vect, cmp_type=cmp_type));
}

dot_two_matrices <- function(matrix1, matrix2, cmp_type){
	#going to end up with matrix1 column names as column names of the output matrix and
	#column names of matrix2 as row names of the output matrix:
	
	return(apply(matrix1, 2, dot_vector_with_matrix, vect_matrix=matrix2, cmp_type=cmp_type));
}

main <- function(argv) {  
	if(length(argv) == 1){
		if(argv==c('--help')){ 
			write(argspec, stderr());
			q();
		}
	}
		
	if(!(length(argv) == 3)){
		write("ERROR: invalid number of arguments is specified", stderr());
		q();
	}
	
	#store command line arguments in variables:
	input_file1 <- argv[1]
	input_file2 <- argv[2]
	cmp_type <- toupper(argv[3])
	
	#input_file1 <- "/Users/ynewton/school/ucsc/projects/stuart_lab/dot_product/test_matrix.tab"
	#input_file2 <- "/Users/ynewton/school/ucsc/projects/stuart_lab/dot_product/test_matrix2.tab"
	#cmp_type <- "DOT"
	
	valid_cmp_types <- c("DOT", "PEARSON", "KENDALL", "SPEARMAN")
	if(!(cmp_type %in% valid_cmp_types)){
		write("ERROR: valid comparison types: dot, pearson, kendall, spearman", stderr());
		q();	
	}
	
	#read the input file(s):
	data_matrix1 <- read_matrix(input_file1)
	data_matrix2 <- read_matrix(input_file2)
	
	#select only the intersection of the rows between the two matrices:
	data_matrix1 <- data_matrix1[rownames(data_matrix1) %in% rownames(data_matrix2),]
	data_matrix2 <- data_matrix2[rownames(data_matrix2) %in% rownames(data_matrix1),]
	data_matrix1 <- data_matrix1[order(rownames(data_matrix1)),]
	data_matrix2 <- data_matrix2[order(rownames(data_matrix2)),]
	
	result_matrix <- dot_two_matrices(data_matrix1,data_matrix2, cmp_type)	
	write_matrix(result_matrix)
}

main(commandArgs(TRUE))
