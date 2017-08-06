FROM node:8
COPY . /app
RUN cd /app && bash scripts/tarball.sh && npm shrinkwrap && bash scripts/global.sh && rm -rf /app
ENTRYPOINT zeronet
