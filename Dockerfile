FROM node:8
ADD . /app
WORKDIR /app
RUN bash scripts/global.sh
WORKDIR /
RUN rm -rf /app
ENTRYPOINT zeronet
