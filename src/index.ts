import crypto from 'crypto'
import fs from 'fs'
import { cardioWrapper } from 'cardio-node'
import cliProgress from 'cli-progress'
import si from 'systeminformation'

const hashbar = new cliProgress.SingleBar(
  { format: '{bar} | {percentage}% | {value}/{total} | {hash}' },
  cliProgress.Presets.shades_classic
)

const allocbar = new cliProgress.SingleBar(
  { format: '{bar} | {percentage}% | {value}/{total} ' },
  cliProgress.Presets.shades_classic
)

const filebar = new cliProgress.SingleBar(
  { format: '{bar} | {percentage}% | {value}/{total} ' },
  cliProgress.Presets.shades_classic
)

// CPU Benchmark
const hash = (size: number): void => {
  let hashstr = 'coolbeans'
  console.log('Hashing Function')
  hashbar.start(size, 0, { hash: hashstr })
  for (let i = 1; i <= size; i++) {
    hashstr = crypto.createHash('sha256').update(i.toString()).digest('hex')
    hashbar.update(i, { hash: hashstr })
  }
  hashbar.stop()
}

interface allocObj {
  id: number
  data: string[]
}

// Memory Benchmark
const allocateDeallocate = (numObjects: number): void => {
  const objects: Array<allocObj | null> = []
  console.log('Memory Allocate and Deallocate Function')
  allocbar.start(numObjects, 0, { object: objects[0] })
  for (let i = 0; i <= numObjects; i++) {
    objects.push({
      id: i,
      data: new Array(4000).fill(crypto.randomBytes(256).toString('hex'))
    })
    allocbar.update(i, { object: objects[i] })
  }
  for (let i = 0; i < objects.length; i++) {
    objects[i] = null
  }
  allocbar.stop()
}

// Disk Sequential Read and Write

const writeZeros = (filePath: string): void => {
  const buffer = Buffer.alloc(1024 * 1024) // 1 MB buffer
  buffer.fill(0)
  let bytesWritten = 0
  filebar.start(2147483648, 0)
  const file = fs.openSync(filePath, 'w')
  while (bytesWritten < 2 * 1024 * 1024 * 1024) {
    fs.writeSync(file, buffer)
    bytesWritten += buffer.length
    filebar.update(bytesWritten)
  }
  fs.closeSync(file)
  fs.unlinkSync(filePath)
  filebar.stop()
}

interface Invocation {
  duration: number
  applicationError: boolean
}

type CardioWrapped = (arg: number | string) => Promise<void>

const hashWithCardio: CardioWrapped = cardioWrapper(
  'hashtime',
  hash,
  (_: unknown, invocation: Invocation) => {
    const runtime = invocation.duration / 1000
    console.log(
      `CPU Benchmark Function ran in ${runtime.toPrecision(3)} Seconds`
    )
  }
)

await hashWithCardio(10000000)

const allocWithCardio: CardioWrapped = cardioWrapper(
  'alloctime',
  allocateDeallocate,
  (_: unknown, invocation: Invocation) => {
    const runtime = invocation.duration / 1000
    console.log(
      `Memory Benchmark Function ran in ${runtime.toPrecision(3)} Seconds`
    )
  }
)

await allocWithCardio(100000)

const filesWithCardio: CardioWrapped = cardioWrapper(
  'filereadwrite',
  writeZeros,
  (_: unknown, invocation: Invocation) => {
    const runtime = invocation.duration / 1000
    console.log(
      `File sequential writes benchmark performed in ${runtime.toPrecision(
        3
      )} Seconds`
    )
  }
)

await filesWithCardio('output.txt')

const cpuData = await si.cpu().catch((error) => console.error(error))
console.log(
  `CPU: ${cpuData?.manufacturer ?? ''} ${cpuData?.brand ?? ''} with ${
    cpuData?.physicalCores ?? ''
  } cores and ${cpuData?.cores ?? ''} threads running at ${
    cpuData?.speedMax ?? ''
  } GHz`
)

const memData = (await si.mem().catch((error) => console.error(error))) ?? {
  total: null
}

if (memData.total != null) {
  console.log(
    `Memory: ${(memData.total / (1024 * 1024 * 1024)).toPrecision(3)}GB`
  )
}
