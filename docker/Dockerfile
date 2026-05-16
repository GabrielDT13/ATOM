FROM python:3.11-slim AS backend-python

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN sed -i 's|http://deb.debian.org|https://deb.debian.org|g' /etc/apt/sources.list.d/debian.sources \
    && apt-get update \
    && apt-get install -y --no-install-recommends \
      curl \
      ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

FROM backend-python AS backend-base

COPY backend /app/backend
COPY docker/start-backend.sh /app/docker/start-backend.sh
RUN chmod +x /app/docker/start-backend.sh

EXPOSE 8000

CMD ["/app/docker/start-backend.sh"]

FROM backend-python AS backend-analysis

RUN sed -i 's|http://deb.debian.org|https://deb.debian.org|g' /etc/apt/sources.list.d/debian.sources \
    && for i in 1 2 3; do \
      if apt-get -o Acquire::Retries=5 -o Acquire::http::Timeout=30 -o Acquire::https::Timeout=30 update \
        && apt-get -o Acquire::Retries=5 -o Acquire::http::Timeout=30 -o Acquire::https::Timeout=30 install -y --no-install-recommends --fix-missing \
          r-base \
          pandoc \
          build-essential \
          cmake \
          gfortran \
          git \
          pkg-config \
          libcurl4-openssl-dev \
          libssl-dev \
          libxml2-dev \
          libuv1-dev \
          libfontconfig1-dev \
          libfreetype6-dev \
          libfribidi-dev \
          libharfbuzz-dev \
          libcairo2-dev \
          libpng-dev \
          libtiff5-dev \
          libjpeg-dev \
          libgit2-dev \
          libglpk-dev \
          libxt-dev \
          zlib1g-dev \
          libbz2-dev \
          liblzma-dev \
          libblas-dev \
          liblapack-dev; \
      then \
        break; \
      fi; \
      if [ "$i" -eq 3 ]; then \
        exit 1; \
      fi; \
      echo "apt failed (attempt $i), retrying in 10s..." >&2; \
      sleep 10; \
    done \
    && rm -rf /var/lib/apt/lists/*

COPY docker/install_r_packages.R /tmp/install_r_packages.R
COPY scripts/requirements-rna-seq-python-poc.txt /tmp/requirements-rna-seq-python-poc.txt
RUN pip install --no-cache-dir -r /tmp/requirements-rna-seq-python-poc.txt
RUN Rscript /tmp/install_r_packages.R

COPY backend /app/backend
COPY docker/start-backend.sh /app/docker/start-backend.sh
RUN chmod +x /app/docker/start-backend.sh

EXPOSE 8000

CMD ["/app/docker/start-backend.sh"]
