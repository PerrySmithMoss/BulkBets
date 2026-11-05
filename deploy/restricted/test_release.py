import importlib.util
import json
import os
from pathlib import Path
import subprocess
import unittest

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('broker', HERE / 'release.py')
broker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(broker)


class BoundaryTests(unittest.TestCase):
    def test_only_full_immutable_references(self):
        sha, digest = 'a' * 40, 'sha256:' + 'b' * 64
        self.assertEqual(broker.validate_args([sha, digest]), (sha, digest))
        for args in [[], [sha], [sha, digest, 'extra'], ['main', digest],
                     [sha + ';id', digest], [sha, 'latest'], [sha, digest + '\n'],
                     ['--help', digest], [sha, 'evil.example/image@' + digest]]:
            with self.subTest(args=args), self.assertRaises(ValueError):
                broker.validate_args(args)

    def test_auth_cannot_override_docker_configuration(self):
        valid = {'username': 'ci-user', 'token': 'x' * 30}
        self.assertEqual(broker.credentials(json.dumps(valid)), valid)
        for value in [[], {**valid, 'DOCKER_HOST': 'tcp://evil'},
                      {**valid, 'username': '--config=/tmp'},
                      {**valid, 'token': 'x' * 8200}, {**valid, 'token': 'x\n' * 30}]:
            with self.subTest(value=type(value)), self.assertRaises(ValueError):
                broker.credentials(json.dumps(value))

    def test_ssh_rejects_shell_socket_subsystems_and_extra_commands(self):
        for command in ['', 'id', 'docker system dial-stdio', 'internal-sftp',
                        'release ' + 'a' * 40 + ' sha256:' + 'b' * 64 + ';id',
                        'release ' + 'a' * 40 + ' sha256:' + 'b' * 64 + '\n']:
            result = subprocess.run(['python3', '-I', str(HERE / 'ssh-command.py')],
                                    env={**os.environ, 'SSH_ORIGINAL_COMMAND': command},
                                    capture_output=True, text=True)
            self.assertEqual(result.returncode, 1)
            self.assertIn('Only the BulkBets release command', result.stderr)


if __name__ == '__main__':
    unittest.main()
