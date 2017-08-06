FROM node:8
COPY . /app
RUN cd /app && bash scripts/tarball.sh && node scripts/no-dev-deps.js package-lock.json > /dev/null && npm shrinkwrap && bash scripts/global.sh && rm -rf /app /root
ENTRYPOINT zeronet
