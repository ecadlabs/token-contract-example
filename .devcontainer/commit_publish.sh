git add .
git commit -m "chore(releng) bump version and pkgsign packages ${VER}"
git tag -s "${VER}"
git push origin "${VER}" master
lerna publish from-package