"""Repositories: the ports the services read and write through, as Protocols.

Each storage adapter implements them (the DynamoDB single-table registry, MA-270; S3; SSM); the services see
only the Protocol, so a test passes an in-memory fake and no service imports boto3.
"""
