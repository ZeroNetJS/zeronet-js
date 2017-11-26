FROM node:8-stretch
RUN wget -O /usr/local/bin/dumb-init https://github.com/Yelp/dumb-init/releases/download/v1.2.0/dumb-init_1.2.0_amd64 && chmod +x /usr/local/bin/dumb-init
COPY . /app
RUN cd /app && bash tools/scripts/tarball.sh && node tools/scripts/no-dev-deps.js package-lock.json > /dev/null && npm shrinkwrap && bash scripts/global.sh && rm -rf /app /root
ENTRYPOINT ["/usr/local/bin/dumb-init","/usr/local/bin/zeronet"]
