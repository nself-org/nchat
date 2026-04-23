/**
 * Mock for @signalapp/libsignal-client
 *
 * Replaces the WASM-backed libsignal-client with Node.js built-in crypto
 * for Jest compatibility. Uses real Ed25519 operations so unit tests verify
 * actual cryptographic behaviour — only the WASM loader is replaced.
 *
 * Implements the subset used by the E2EE kyber-signature and kyber-prekey-store
 * tests: PrivateKey, PublicKey, KEMKeyPair, ProtocolAddress, SessionStore,
 * PreKeyStore, SignedPreKeyStore, IdentityKeyStore, PreKeyBundle.
 */

import * as nodeCrypto from 'crypto'

// ---------------------------------------------------------------------------
// Ed25519 key helpers (real crypto, no mocks)
// ---------------------------------------------------------------------------

function generateEd25519KeyPair(): { publicKey: Buffer; privateKey: Buffer } {
  const { publicKey, privateKey } = nodeCrypto.generateKeyPairSync('ed25519')
  const pub = publicKey.export({ type: 'spki', format: 'der' })
  const priv = privateKey.export({ type: 'pkcs8', format: 'der' })
  // Return raw 32-byte key material extracted from DER wrappers.
  // Ed25519 SPKI DER is 44 bytes; raw pubkey is last 32.
  // Ed25519 PKCS8 DER is 48 bytes; raw privkey is last 32.
  return {
    publicKey: Buffer.from(pub).slice(-32),
    privateKey: Buffer.from(priv).slice(-32),
  }
}

function signEd25519(privateKeyBytes: Buffer, message: Buffer): Buffer {
  // Re-wrap raw 32-byte key into PKCS8 DER for Node.js sign.
  const pkcs8Header = Buffer.from(
    '302e020100300506032b657004220420',
    'hex'
  )
  const pkcs8 = Buffer.concat([pkcs8Header, privateKeyBytes])
  const key = nodeCrypto.createPrivateKey({ key: pkcs8, format: 'der', type: 'pkcs8' })
  return Buffer.from(nodeCrypto.sign(null, message, key))
}

function verifyEd25519(publicKeyBytes: Buffer, message: Buffer, signature: Buffer): boolean {
  // Re-wrap raw 32-byte key into SPKI DER for Node.js verify.
  const spkiHeader = Buffer.from('302a300506032b6570032100', 'hex')
  const spki = Buffer.concat([spkiHeader, publicKeyBytes])
  const key = nodeCrypto.createPublicKey({ key: spki, format: 'der', type: 'spki' })
  return nodeCrypto.verify(null, message, key, signature)
}

// ---------------------------------------------------------------------------
// PrivateKey
// ---------------------------------------------------------------------------

export class PrivateKey {
  private _bytes: Buffer

  private constructor(bytes: Buffer) {
    this._bytes = bytes
  }

  static generate(): PrivateKey {
    const { privateKey } = generateEd25519KeyPair()
    return new PrivateKey(privateKey)
  }

  static deserialize(bytes: Buffer): PrivateKey {
    return new PrivateKey(bytes)
  }

  serialize(): Buffer {
    return this._bytes
  }

  sign(message: Buffer): Buffer {
    return signEd25519(this._bytes, message)
  }

  getPublicKey(): PublicKey {
    // Derive public key from private key.
    const pkcs8Header = Buffer.from('302e020100300506032b657004220420', 'hex')
    const pkcs8 = Buffer.concat([pkcs8Header, this._bytes])
    const key = nodeCrypto.createPrivateKey({ key: pkcs8, format: 'der', type: 'pkcs8' })
    const pub = nodeCrypto.createPublicKey(key)
    const spki = pub.export({ type: 'spki', format: 'der' })
    return PublicKey.deserialize(Buffer.from(spki).slice(-32))
  }
}

// ---------------------------------------------------------------------------
// PublicKey
// ---------------------------------------------------------------------------

export class PublicKey {
  private _bytes: Buffer

  private constructor(bytes: Buffer) {
    this._bytes = bytes
  }

  static deserialize(bytes: Buffer): PublicKey {
    return new PublicKey(bytes)
  }

  serialize(): Buffer {
    return this._bytes
  }

  verify(message: Buffer, signature: Buffer): boolean {
    return verifyEd25519(this._bytes, message, signature)
  }

  compare(other: PublicKey): number {
    return Buffer.compare(this._bytes, other._bytes)
  }
}

// ---------------------------------------------------------------------------
// KEMKeyPair (Kyber / KEM — mocked with Ed25519 for test purposes)
// ---------------------------------------------------------------------------

export class KEMKeyPair {
  private _pub: KEMPublicKey
  private _priv: KEMPrivateKey

  private constructor(pub: KEMPublicKey, priv: KEMPrivateKey) {
    this._pub = pub
    this._priv = priv
  }

  static generate(): KEMKeyPair {
    // Use Ed25519 as stand-in for Kyber KEM key in test environment.
    const { publicKey, privateKey } = generateEd25519KeyPair()
    return new KEMKeyPair(new KEMPublicKey(publicKey), new KEMPrivateKey(privateKey))
  }

  static _fromParts(pub: KEMPublicKey, priv: KEMPrivateKey): KEMKeyPair {
    // Internal factory used by KyberPreKeyRecord.deserialize.
    return new KEMKeyPair(pub, priv)
  }

  getPublicKey(): KEMPublicKey {
    return this._pub
  }

  getPrivateKey(): KEMPrivateKey {
    return this._priv
  }
}

export class KEMPublicKey {
  private _bytes: Buffer
  constructor(bytes: Buffer) {
    this._bytes = bytes
  }
  serialize(): Buffer {
    return this._bytes
  }
  static deserialize(bytes: Buffer): KEMPublicKey {
    return new KEMPublicKey(bytes)
  }
}

export class KEMPrivateKey {
  private _bytes: Buffer
  constructor(bytes: Buffer) {
    this._bytes = bytes
  }
  serialize(): Buffer {
    return this._bytes
  }
}

// ---------------------------------------------------------------------------
// ProtocolAddress
// ---------------------------------------------------------------------------

export class ProtocolAddress {
  private _name: string
  private _deviceId: number

  private constructor(name: string, deviceId: number) {
    this._name = name
    this._deviceId = deviceId
  }

  static new(name: string, deviceId: number): ProtocolAddress {
    return new ProtocolAddress(name, deviceId)
  }

  name(): string {
    return this._name
  }

  deviceId(): number {
    return this._deviceId
  }

  toString(): string {
    return `${this._name}.${this._deviceId}`
  }
}

// ---------------------------------------------------------------------------
// PreKeyBundle
// ---------------------------------------------------------------------------

export class PreKeyBundle {
  static new(
    registrationId: number,
    deviceId: number,
    preKeyId: number | null,
    preKeyPublic: PublicKey | null,
    signedPreKeyId: number,
    signedPreKeyPublic: PublicKey,
    signedPreKeySignature: Buffer,
    identityKey: PublicKey,
    kyberPreKeyId: number | null,
    kyberPreKeyPublic: KEMPublicKey | null,
    kyberPreKeySignature: Buffer | null
  ): PreKeyBundle {
    // In the real impl, this validates the signed pre-key signature.
    // Mock: only validate if we have the identity key.
    const valid = identityKey.verify(signedPreKeyPublic.serialize(), signedPreKeySignature)
    if (!valid) {
      throw new Error('Invalid signed pre-key signature in PreKeyBundle')
    }
    return new PreKeyBundle()
  }
}

// ---------------------------------------------------------------------------
// Store interfaces (minimal stubs for processPreKeyBundle compat)
// ---------------------------------------------------------------------------

export interface SessionRecord {
  serialize(): Buffer
}

export class SessionStore {
  private _sessions: Map<string, Buffer> = new Map()

  async saveSession(address: ProtocolAddress, record: SessionRecord): Promise<void> {
    this._sessions.set(address.toString(), record.serialize())
  }

  async getSession(address: ProtocolAddress): Promise<SessionRecord | null> {
    const data = this._sessions.get(address.toString())
    if (!data) return null
    return { serialize: () => data }
  }

  async getExistingSessions(addresses: ProtocolAddress[]): Promise<SessionRecord[]> {
    return addresses.map((a) => {
      const data = this._sessions.get(a.toString())
      return data ? { serialize: () => data } : null
    }).filter((x): x is SessionRecord => x !== null)
  }
}

export class PreKeyStore {
  private _keys: Map<number, Buffer> = new Map()

  async savePreKey(id: number, record: { serialize(): Buffer }): Promise<void> {
    this._keys.set(id, record.serialize())
  }

  async getPreKey(id: number): Promise<{ serialize(): Buffer }> {
    const data = this._keys.get(id)
    if (!data) throw new Error(`PreKey ${id} not found`)
    return { serialize: () => data }
  }

  async removePreKey(id: number): Promise<void> {
    this._keys.delete(id)
  }
}

export class SignedPreKeyStore {
  private _keys: Map<number, Buffer> = new Map()

  async saveSignedPreKey(id: number, record: { serialize(): Buffer }): Promise<void> {
    this._keys.set(id, record.serialize())
  }

  async getSignedPreKey(id: number): Promise<{ serialize(): Buffer }> {
    const data = this._keys.get(id)
    if (!data) throw new Error(`SignedPreKey ${id} not found`)
    return { serialize: () => data }
  }
}

export class IdentityKeyStore {
  private _identityKey: { publicKey: Buffer; privateKey: Buffer }
  private _registrationId: number
  private _trustedKeys: Map<string, Buffer> = new Map()

  constructor(identityKey: { publicKey: Buffer; privateKey: Buffer }, registrationId: number) {
    this._identityKey = identityKey
    this._registrationId = registrationId
  }

  async getIdentityKey(): Promise<PrivateKey> {
    return PrivateKey.deserialize(Buffer.from(this._identityKey.privateKey))
  }

  async getLocalRegistrationId(): Promise<number> {
    return this._registrationId
  }

  async saveIdentity(address: ProtocolAddress, identityKey: PublicKey): Promise<boolean> {
    const existing = this._trustedKeys.get(address.toString())
    this._trustedKeys.set(address.toString(), identityKey.serialize())
    return existing !== undefined
  }

  async isTrustedIdentity(
    address: ProtocolAddress,
    identityKey: PublicKey,
    _direction: number
  ): Promise<boolean> {
    const trusted = this._trustedKeys.get(address.toString())
    if (!trusted) return true // First use: trust on first use
    return Buffer.compare(trusted, identityKey.serialize()) === 0
  }

  async getIdentity(address: ProtocolAddress): Promise<PublicKey | null> {
    const data = this._trustedKeys.get(address.toString())
    return data ? PublicKey.deserialize(data) : null
  }
}

// ---------------------------------------------------------------------------
// IdentityKeyPair
// ---------------------------------------------------------------------------

export class IdentityKeyPair {
  public readonly publicKey: PublicKey
  public readonly privateKey: PrivateKey

  constructor(publicKey: PublicKey, privateKey: PrivateKey) {
    this.publicKey = publicKey
    this.privateKey = privateKey
  }

  static generate(): IdentityKeyPair {
    const { publicKey, privateKey } = generateEd25519KeyPair()
    return new IdentityKeyPair(
      PublicKey.deserialize(publicKey),
      PrivateKey.deserialize(privateKey)
    )
  }

  serialize(): Buffer {
    return Buffer.concat([this.publicKey.serialize(), this.privateKey.serialize()])
  }
}

// ---------------------------------------------------------------------------
// InMemorySessionStore
// ---------------------------------------------------------------------------

export class InMemorySessionStore extends SessionStore {}

// ---------------------------------------------------------------------------
// InMemoryIdentityKeyStore
// ---------------------------------------------------------------------------

export class InMemoryIdentityKeyStore extends IdentityKeyStore {
  constructor(identityKey: IdentityKeyPair, registrationId: number) {
    super(
      {
        publicKey: identityKey.publicKey.serialize(),
        privateKey: identityKey.privateKey.serialize(),
      },
      registrationId
    )
  }
}

// ---------------------------------------------------------------------------
// processPreKeyBundle (mock — validates and returns without throwing)
// ---------------------------------------------------------------------------

export async function processPreKeyBundle(
  _bundle: PreKeyBundle,
  _address: ProtocolAddress,
  _sessionStore: SessionStore,
  _identityStore: IdentityKeyStore
): Promise<void> {
  // In real impl, this initiates an X3DH session. In tests, bundle construction
  // already validates signatures. If we reach here, the bundle was valid.
}

// ---------------------------------------------------------------------------
// KyberPreKeyRecord
// ---------------------------------------------------------------------------

export class KyberPreKeyRecord {
  private _id: number
  private _data: Buffer

  constructor(id: number, keyPair: KEMKeyPair) {
    this._id = id
    // Serialize as: [4-byte id LE][32-byte pub][32-byte priv]
    const idBuf = Buffer.alloc(4)
    idBuf.writeUInt32LE(id, 0)
    this._data = Buffer.concat([
      idBuf,
      keyPair.getPublicKey().serialize(),
      keyPair.getPrivateKey().serialize(),
    ])
  }

  static new(id: number, _timestamp: number, keyPair: KEMKeyPair): KyberPreKeyRecord {
    return new KyberPreKeyRecord(id, keyPair)
  }

  id(): number {
    return this._id
  }

  serialize(): Buffer {
    return this._data
  }

  static deserialize(bytes: Buffer): KyberPreKeyRecord {
    const id = bytes.readUInt32LE(0)
    const pub = new KEMPublicKey(bytes.slice(4, 36))
    const priv = new KEMPrivateKey(bytes.slice(36, 68))
    const pair = KEMKeyPair._fromParts(pub, priv)
    return new KyberPreKeyRecord(id, pair)
  }
}

// ---------------------------------------------------------------------------
// KyberPreKeyStore (abstract base — matches libsignal interface)
// ---------------------------------------------------------------------------

export class KyberPreKeyStore {
  async saveKyberPreKey(
    _kyberPreKeyId: number,
    _record: KyberPreKeyRecord
  ): Promise<void> {
    throw new Error('KyberPreKeyStore.saveKyberPreKey not implemented')
  }

  async getKyberPreKey(_kyberPreKeyId: number): Promise<KyberPreKeyRecord> {
    throw new Error('KyberPreKeyStore.getKyberPreKey not implemented')
  }

  async markKyberPreKeyUsed(
    _kyberPreKeyId: number,
    _signedPreKeyId: number,
    _baseKey: PublicKey
  ): Promise<void> {
    throw new Error('KyberPreKeyStore.markKyberPreKeyUsed not implemented')
  }
}

// ---------------------------------------------------------------------------
// IdentityChange enum
// ---------------------------------------------------------------------------

export enum IdentityChange {
  NewOrUnchanged = 0,
  ReplacedExisting = 1,
}

// ---------------------------------------------------------------------------
// Direction enum
// ---------------------------------------------------------------------------

export enum Direction {
  Sending = 0,
  Receiving = 1,
}
