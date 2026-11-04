package main

import (
	"context"
	"encoding/json"
	"errors"
	"net/http/httptest"
	"reflect"
	"testing"

	"github.com/PerrySmithMoss/BulkBets/server/internal/store"
)

type directoryRepository struct {
	list    func(context.Context) ([]store.Show, error)
	details func(context.Context, int) (*store.ShowDetails, error)
}

func (s directoryRepository) ListShows(ctx context.Context) ([]store.Show, error) {
	return s.list(ctx)
}

func (s directoryRepository) GetShowByID(ctx context.Context, id int) (*store.ShowDetails, error) {
	return s.details(ctx, id)
}

func TestShowDirectoryPreservesOrderContextAndPartialResults(t *testing.T) {
	for _, partial := range []bool{false, true} {
		t.Run(map[bool]string{false: "complete", true: "partial"}[partial], func(t *testing.T) {
			r := httptest.NewRequest("GET", "/api/v1/shows/directory", nil)
			r = r.WithContext(store.WithViewer(r.Context(), "visitor"))
			var calls []int
			app := &application{store: store.Storage{ShowRepository: directoryRepository{
				list: func(ctx context.Context) ([]store.Show, error) {
					if ctx != r.Context() {
						t.Fatal("list lost the viewer context")
					}
					return []store.Show{{ID: 3}, {ID: 1}, {ID: 2}}, nil
				},
				details: func(ctx context.Context, id int) (*store.ShowDetails, error) {
					if ctx != r.Context() {
						t.Fatal("details lost the viewer context")
					}
					calls = append(calls, id)
					if partial && id == 1 {
						return nil, store.ErrNotFound
					}
					return &store.ShowDetails{Show: store.Show{ID: int64(id)}}, nil
				},
			}}}
			w := httptest.NewRecorder()
			app.showDirectoryHandler(w, r)
			var result struct {
				Data struct {
					Shows   []store.ShowDetails `json:"shows"`
					Partial bool                `json:"partial"`
				} `json:"data"`
			}
			if w.Code != 200 || json.Unmarshal(w.Body.Bytes(), &result) != nil {
				t.Fatalf("unexpected response: %d %s", w.Code, w.Body.String())
			}
			var ids []int
			for _, details := range result.Data.Shows {
				ids = append(ids, int(details.Show.ID))
			}
			want := []int{3, 1, 2}
			if partial {
				want = []int{3, 2}
			}
			if !reflect.DeepEqual(calls, []int{3, 1, 2}) || !reflect.DeepEqual(ids, want) || result.Data.Partial != partial {
				t.Fatalf("calls=%v shows=%v partial=%v", calls, ids, result.Data.Partial)
			}
		})
	}
}

func TestShowDirectoryEmptyAndUnavailable(t *testing.T) {
	for _, unavailable := range []bool{false, true} {
		app := &application{store: store.Storage{ShowRepository: directoryRepository{
			list: func(context.Context) ([]store.Show, error) {
				if unavailable {
					return nil, errors.New("database unavailable")
				}
				return nil, nil
			},
		}}}
		w := httptest.NewRecorder()
		app.showDirectoryHandler(w, httptest.NewRequest("GET", "/api/v1/shows/directory", nil))
		if unavailable {
			if w.Code != 500 {
				t.Fatalf("unavailable directory returned %d", w.Code)
			}
		} else if w.Code != 200 || w.Body.String() != "{\"data\":{\"shows\":[],\"partial\":false}}\n" {
			t.Fatalf("unexpected empty directory: %d %s", w.Code, w.Body.String())
		}
	}
}
