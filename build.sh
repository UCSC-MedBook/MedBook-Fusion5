cd webapp
meteor build --release 1.1 --directory ../build
cd ../build/bundle
cp ../../package.json .
npm install
