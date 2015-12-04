fat <- function(arg) {
   if (typeof(arg) == "list")
      lapply(arg, fat)
   else {
      cat(arg, file="/tmp/fat", append=TRUE);
      cat("\n", file="/tmp/fat", append=TRUE);
  }
}
fat("before 0");
args <- commandArgs(trailingOnly = TRUE);
fat("before 1");


fat("before 2");

library(rmongodb)
fat("before 3");
conn <- mongo.create()
coll <- "MedBook.QuickR";
id <- mongo.bson.from.list(list("_id"=args[1]));
fat("before 4");

#Fetch
data <- mongo.bson.to.list(mongo.findOne(conn, coll, id));

fat("before 5");
#Calc
n = length(data$input);
output <- list();
MINLENGTH = 2;
for (i in 1:(n-1))
    for (j in (i+1):n) {
        print( length(data$input));
        if (length(data$input[[i]]$value) > MINLENGTH && length(data$input[[j]]$value) > MINLENGTH) {
fat("i");
fat(i);
fat("")
fat(data$input[[i]]$value)
fat("j");
fat(j);
fat("")
    fat(data$input[[j]]$value)
            pVal = t.test(unlist(data$input[[i]]$value), unlist(data$input[[j]]$value))$p.value;
fat("pVal")
fat(pVal);
            key = paste( data$input[[i]]$key, "***", data$input[[j]]$key, sep="");
fat("key")
fat(pVal);
            output[key] = pVal;
        }
    }


# Store
bson <- mongo.bson.from.list(list("$set"=list(output=output)))
mongo.update(conn, coll, id, bson)

quit("no", status=0);
    
