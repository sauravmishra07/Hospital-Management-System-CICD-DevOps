# ── Fill in your actual values here ──────────────────────────────────────────

aws_region   = "us-west-1"
project_name = "hospital-app"
key_pair_name = "eks-nodegroup-key"   # must exist in your AWS account

# Node group sizing
node_instance_type = "t2.medium"
node_min_size      = 2
node_max_size      = 4
node_desired_size  = 2

# Ubuntu 22.04 LTS AMI for us-west-1 (update if needed)
ec2_ami = "ami-0d53d72369335a9d6"
