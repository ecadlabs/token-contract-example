# keybase pgp select --import --no-publish
for i in $(find packages/ -mindepth 1 -maxdepth 1 -type d); do
    pkgsign sign "$i"
done