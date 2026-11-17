"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="main-wrap py-12">
      <h1 className="text-2xl">This workspace could not load.</h1>
      <p className="lead mt-3">
        Check your connection and try again. Your saved cloud records have not
        been removed.
      </p>
      <button className="primary-button mt-6" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
