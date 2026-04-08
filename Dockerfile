FROM python:3.11-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends locales tzdata libpq5 && \
    locale-gen pt_BR.UTF-8 && \
    localedef -i pt_BR -f UTF-8 pt_BR.UTF-8 && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

COPY requirements.txt ./

RUN pip install --no-cache-dir -r requirements.txt

ENV LANG=pt_BR.UTF-8
ENV LANGUAGE=pt_BR:pt
ENV LC_ALL=pt_BR.UTF-8
ENV PYTHONUNBUFFERED=1

COPY . .

CMD ["gunicorn", "--bind", "0.0.0.0:8001", "app:app"]