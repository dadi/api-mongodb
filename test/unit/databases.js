export const DATABASES = [
  {
    id: 'authdb',
    hosts: '127.0.0.1:27017',
    username: 'johndoe',
    password: 'topsecret',
  },
  {
    id: 'defaultdb',
    hosts: '127.0.0.1:27017',
    default: true,
  },
  {
    id: 'invaliddb',
    hosts: '127.0.0.1:27019',
  },
  {
    id: 'replicadb',
    hosts: '127.0.0.1:27017',
    replicaSet: 'rs0',
  },
  {
    id: 'somedb',
    hosts: '127.0.0.1:27017',
    username: 'johndoe',
    password: 'topsecret',
  },
  {
    id: 'secondary',
    hosts: '127.0.0.1:27018',
  },
  {
    id: 'testdb',
    hosts: '127.0.0.1:27017',
  },
]

export const DATABASES_NO_DEFAULT = [
  {
    id: 'authdb',
    hosts: '127.0.0.1:27017',
    username: 'johndoe',
    password: 'topsecret',
  },
  {
    id: 'defaultdb',
    hosts: '127.0.0.1:27017',
  },
  {
    id: 'invaliddb',
    hosts: '127.0.0.1:27019',
  },
  {
    id: 'replicadb',
    hosts: '127.0.0.1:27017',
    replicaSet: 'rs0',
  },
  {
    id: 'somedb',
    hosts: '127.0.0.1:27017',
    username: 'johndoe',
    password: 'topsecret',
  },
  {
    id: 'secondary',
    hosts: '127.0.0.1:27018',
  },
  {
    id: 'testdb',
    hosts: '127.0.0.1:27017',
  },
]
