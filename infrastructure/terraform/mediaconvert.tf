# Pitfal Solutions - MediaConvert (Video Preview Generation)

# ─────────────────────────────────────────────
# MediaConvert Execution Role
# ─────────────────────────────────────────────

resource "aws_iam_role" "mediaconvert" {
  name = "${local.name_prefix}-mediaconvert"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "mediaconvert.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "mediaconvert_s3" {
  name = "${local.name_prefix}-mediaconvert-s3"
  role = aws_iam_role.mediaconvert.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = ["s3:GetObject"]
        Resource = [
          "${aws_s3_bucket.media.arn}/staging/videos/*",
          "${aws_s3_bucket.media.arn}/gallery/*/videos/*"
        ]
      },
      {
        Effect = "Allow"
        Action = ["s3:PutObject"]
        Resource = "${aws_s3_bucket.media.arn}/video-previews/*"
      }
    ]
  })
}
