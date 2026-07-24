FROM node:20-bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    biber \
    fonts-noto-cjk \
    texlive-bibtex-extra \
    texlive-fonts-recommended \
    texlive-lang-chinese \
    texlive-lang-korean \
    texlive-latex-extra \
    texlive-xetex \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . /app

RUN mkdir -p /var/lib/knut-thesis/users \
  && chown -R node:node /var/lib/knut-thesis

USER node
ENV HOST=0.0.0.0
ENV PORT=4173
ENV KNUT_DATA_ROOT=/var/lib/knut-thesis

EXPOSE 4173
VOLUME ["/var/lib/knut-thesis"]

CMD ["node", "local-app/production-server.mjs"]
