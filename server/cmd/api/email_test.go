package main

import (
	"bufio"
	"fmt"
	"io"
	"net"
	"net/textproto"
	"strings"
	"testing"
	"time"

	"github.com/PerrySmithMoss/BulkBets/server/config"
)

// A one-connection, in-process SMTP fixture keeps delivery checks independent
// of external mail services, provider credentials and running containers.
func TestResetEmailSMTPDeliveryAndProductionTLS(t *testing.T) {
	for _, mode := range []string{"development", "production"} {
		t.Run(mode, func(t *testing.T) {
			listener, err := net.Listen("tcp", "127.0.0.1:0")
			if err != nil {
				t.Fatal(err)
			}
			defer listener.Close()
			t.Setenv("SMTP_ADDR", listener.Addr().String())
			t.Setenv("SMTP_FROM", "noreply@example.test")
			t.Setenv("SMTP_USERNAME", "")
			t.Setenv("SMTP_PASSWORD", "")
			messages := make(chan string, 1)
			finished := make(chan error, 1)
			go func() {
				conn, err := listener.Accept()
				if err != nil {
					finished <- err
					return
				}
				defer conn.Close()
				conn.SetDeadline(time.Now().Add(5 * time.Second))
				reader := textproto.NewReader(bufio.NewReader(conn))
				if _, err = fmt.Fprint(conn, "220 localhost test SMTP\r\n"); err != nil {
					finished <- err
					return
				}
				for {
					line, readErr := reader.ReadLine()
					if readErr != nil {
						if mode == "production" && readErr == io.EOF {
							finished <- nil
						} else {
							finished <- readErr
						}
						return
					}
					switch {
					case strings.HasPrefix(line, "EHLO "), strings.HasPrefix(line, "HELO "):
						_, err = fmt.Fprint(conn, "250 localhost\r\n")
					case strings.HasPrefix(line, "MAIL FROM:"), strings.HasPrefix(line, "RCPT TO:"):
						_, err = fmt.Fprint(conn, "250 OK\r\n")
					case line == "DATA":
						_, err = fmt.Fprint(conn, "354 Send message\r\n")
						if err == nil {
							var body []byte
							body, err = io.ReadAll(reader.DotReader())
							if err == nil {
								messages <- string(body)
								_, err = fmt.Fprint(conn, "250 Accepted\r\n")
							}
						}
					case line == "QUIT":
						_, err = fmt.Fprint(conn, "221 Goodbye\r\n")
						finished <- err
						return
					default:
						finished <- fmt.Errorf("unexpected SMTP command: %s", line)
						return
					}
					if err != nil {
						finished <- err
						return
					}
				}
			}()
			app := &application{cfg: config.Config{App: config.AppConfig{AppEnv: mode}}}
			link := "https://app.example.test/reset-password#token=" + strings.Repeat("a", 64)
			err = app.sendResetEmail("recipient@example.test", link)
			if mode == "production" {
				if err == nil || !strings.Contains(err.Error(), "requires TLS") {
					t.Fatalf("expected TLS rejection, got %v", err)
				}
				if len(messages) != 0 {
					t.Fatal("production sent a message over plaintext SMTP")
				}
			} else {
				if err != nil {
					t.Fatal(err)
				}
				select {
				case body := <-messages:
					for _, value := range []string{"To: recipient@example.test", "Subject: Reset your BulkBets password", link, "expires in 30 minutes"} {
						if !strings.Contains(body, value) {
							t.Errorf("message is missing %q", value)
						}
					}
				default:
					t.Fatal("SMTP accepted no message")
				}
			}
			select {
			case err := <-finished:
				if err != nil {
					t.Fatal(err)
				}
			case <-time.After(6 * time.Second):
				t.Fatal("SMTP fixture did not finish")
			}
		})
	}
}
