# Pitfal Solutions - Image Processor Lambda
# Handles CR2/CR3 RAW files with professional auto-editing
#
# Build: docker build -t pitfal-image-processor .
# Push:  docker tag pitfal-image-processor:latest <account>.dkr.ecr.<region>.amazonaws.com/pitfal-image-processor:latest
#        docker push <account>.dkr.ecr.<region>.amazonaws.com/pitfal-image-processor:latest

FROM public.ecr.aws/lambda/nodejs:22 AS builder

# Install build dependencies for LibRaw and Sharp
RUN dnf install -y \
    gcc-c++ \
    make \
    cmake \
    autoconf \
    automake \
    libtool \
    wget \
    tar \
    gzip \
    zlib-devel \
    libjpeg-turbo-devel \
    && dnf clean all

# Build LibRaw from source for CR2/CR3 support
# LibRaw 0.21.x supports Canon CR3 format
RUN cd /tmp && \
    wget -q https://www.libraw.org/data/LibRaw-0.21.2.tar.gz && \
    tar xzf LibRaw-0.21.2.tar.gz && \
    cd LibRaw-0.21.2 && \
    autoreconf --install && \
    ./configure --prefix=/opt/libraw && \
    make -j$(nproc) && \
    make install && \
    rm -rf /tmp/LibRaw-*

# Production stage
FROM public.ecr.aws/lambda/nodejs:22

# Copy LibRaw binaries and libraries
COPY --from=builder /opt/libraw /opt/libraw
ENV PATH="/opt/libraw/bin:${PATH}"
ENV LD_LIBRARY_PATH="/opt/libraw/lib:${LD_LIBRARY_PATH}"

# Install runtime dependencies
RUN dnf install -y \
    libjpeg-turbo \
    zlib \
    perl-Image-ExifTool \
    && dnf clean all

# Copy package files and install dependencies
WORKDIR ${LAMBDA_TASK_ROOT}
COPY package.json ./
RUN npm install --production --no-optional

# Copy compiled application code
COPY dist/ ./

CMD ["index.handler"]
