FROM node:8
ADD . /app
WORKDIR /app
RUN bash scripts/tarball.sh && npm shrinkwrap && bash scripts/global.sh
WORKDIR /
RUN rm -rf /app
ENTRYPOINT zeronet
