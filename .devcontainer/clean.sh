lerna clean --no-private --yes

for i in $(find packages/ -mindepth 1 -maxdepth 1 -type d); do
    rm "$i/package-lock.json"
done