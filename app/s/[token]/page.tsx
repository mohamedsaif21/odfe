export default function SelfOrderTokenPage({ params }: { params: { token: string } }) {
  return <h1 className="text-2xl font-semibold">Self Order: {params.token}</h1>
}
