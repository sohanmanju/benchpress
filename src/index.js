import crypto from 'crypto'
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
// CPU Benchmark
const hash = (size) => {
  let hashstr = 'coolbeans'
  console.log('Hashing Function')
  hashbar.start(size, 0, { hash: hashstr })
  for (let i = 1; i <= size; i++) {
    hashstr = crypto.createHash('sha256').update(i.toString()).digest('hex')
    hashbar.update(i, { hash: hashstr })
  }
  hashbar.stop()
}
// Memory Benchmark
const allocateDeallocate = (numObjects) => {
  const objects = []
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
const hashWithCardio = cardioWrapper('hashtime', hash, (_, invocation) => {
  const runtime = invocation.duration / 1000
  console.log(`CPU Benchmark Function ran in ${runtime.toPrecision(3)} Seconds`)
})

await hashWithCardio(10000000)

const allocWithCardio = cardioWrapper(
  'alloctime',
  allocateDeallocate,
  (_, invocation) => {
    const runtime = invocation.duration / 1000
    console.log(
      `Memory Benchmark Function ran in ${runtime.toPrecision(3)} Seconds`
    )
  }
)
await allocWithCardio(100000)
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
