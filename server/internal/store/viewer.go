package store

import "context"

type viewerKey struct{}

func WithViewer(ctx context.Context, id string) context.Context {
	return context.WithValue(ctx, viewerKey{}, id)
}

func viewerID(ctx context.Context) string {
	id, _ := ctx.Value(viewerKey{}).(string)
	// A valid UUID keeps the visibility predicate typed even for public requests.
	if id == "" {
		return "00000000-0000-0000-0000-000000000000"
	}
	return id
}
