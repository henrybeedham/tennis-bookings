<script lang="ts">
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import ShieldAlert from '@lucide/svelte/icons/shield-alert';
	import Trash from '@lucide/svelte/icons/trash-2';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import SiteHeader from '#lib/components/SiteHeader.svelte';
	import { formatLong, formatRange } from '#lib/dates.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	/** The address waiting for "Yes, delete" to be pressed. */
	let confirming = $state<string | null>(null);
	let busy = $state(false);

	function when(at: string) {
		return new Date(at.replace(' ', 'T') + 'Z').toLocaleString('en-GB', {
			timeZone: 'Europe/London',
			day: 'numeric',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	const plural = (n: number) => `${n} upcoming booking${n === 1 ? '' : 's'}`;
</script>

<svelte:head>
	<title>Superadmin</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

{#if !data.superadmin}
	<main class="grid min-h-dvh place-items-center px-4 py-10">
		<form
			method="POST"
			action="?/login"
			use:enhance
			class="panel flex w-full max-w-sm flex-col gap-5 rounded-3xl p-7"
		>
			<div class="grid size-11 place-items-center rounded-2xl bg-ball text-on-ball">
				<ShieldAlert class="size-5" />
			</div>
			<h1 class="text-2xl font-semibold">Superadmin</h1>
			<div class="flex flex-col gap-2">
				<Label for="pw">Password</Label>
				<Input id="pw" name="password" type="password" autocomplete="current-password" required />
			</div>
			{#if form && 'error' in form && form.error}
				<p role="alert" class="flex items-center gap-2 font-semibold text-destructive">
					<TriangleAlert class="size-5" />{form.error}
				</p>
			{/if}
			<Button type="submit" size="lg">Log in</Button>
		</form>
	</main>
{:else}
	<SiteHeader title="Superadmin" href="/superadmin">
		<form method="POST" action="?/logout">
			<Button type="submit" variant="outline" size="sm" class="h-10">Log out</Button>
		</form>
	</SiteHeader>

	<div class="mx-auto flex max-w-4xl flex-col gap-6 px-4 pt-10 pb-12 sm:px-6">
		<div class="flex flex-col gap-1">
			<h1 class="text-fade text-4xl font-semibold tracking-[-0.04em]">Bookings by address</h1>
			<p class="text-base text-ink-soft">
				Upcoming bookings made on the public calendar, grouped by the internet address they came
				from. Use this to clear out spam. Deleting only removes bookings that haven’t finished yet.
				Bookings made at the post office aren’t shown.
			</p>
		</div>

		{#if data.groups.length === 0}
			<p class="panel rounded-3xl p-7 text-center text-base text-ink-soft">
				No upcoming public bookings.
			</p>
		{:else}
			<ul class="flex flex-col gap-3">
				{#each data.groups as g (g.ip)}
					<li class="panel flex flex-col gap-3 rounded-3xl p-5">
						<div class="flex flex-wrap items-start gap-x-6 gap-y-2">
							<div class="min-w-52 flex-1">
								<p class="font-mono text-base font-semibold break-all">{g.ip}</p>
								<p class="text-ink-soft">
									{plural(g.bookings.length)} · made {when(g.firstMade)}{g.firstMade !== g.lastMade
										? ` – ${when(g.lastMade)}`
										: ''}
								</p>
								<p class="text-ink-soft">
									Names: {g.names.slice(0, 8).join(', ')}{g.names.length > 8
										? ` and ${g.names.length - 8} more`
										: ''}
								</p>
							</div>
							{#if confirming !== g.ip}
								<Button
									variant="outline"
									class="text-destructive"
									onclick={() => (confirming = g.ip)}
								>
									<Trash />Delete all…
								</Button>
							{/if}
						</div>

						{#if confirming === g.ip}
							<form
								method="POST"
								action="?/deleteByIp"
								class="flex flex-wrap items-center gap-3 rounded-2xl border border-destructive/40 p-4"
								use:enhance={() => {
									busy = true;
									return async ({ result, update }) => {
										busy = false;
										if (result.type === 'success') {
											toast.success(`Deleted ${plural(Number(result.data?.deleted ?? 0))}.`);
											confirming = null;
										} else if (result.type === 'failure') {
											toast.error(String(result.data?.error ?? 'Something went wrong.'));
										}
										await update();
									};
								}}
							>
								<input type="hidden" name="ip" value={g.ip} />
								<p class="min-w-52 flex-1 font-semibold">
									Delete {plural(g.bookings.length)} from this address? This can’t be undone.
								</p>
								<Button variant="ghost" onclick={() => (confirming = null)}>Keep them</Button>
								<Button type="submit" variant="destructive" disabled={busy}>Yes, delete</Button>
							</form>
						{/if}

						<details>
							<summary class="cursor-pointer text-ink-soft underline underline-offset-4">
								Show bookings
							</summary>
							<ul class="mt-2 flex flex-col divide-y divide-line">
								{#each g.bookings as b (b.id)}
									<li class="flex flex-wrap gap-x-4 py-2">
										<span class="min-w-40 flex-1 font-semibold">{b.name}</span>
										<span class="tabular-nums">
											{formatLong(b.date)} · {formatRange(b.start, b.end)}
										</span>
									</li>
								{/each}
							</ul>
						</details>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
{/if}
