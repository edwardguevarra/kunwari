// Kunwari — a fake workday that runs itself.
//
// This binary carries the whole app inside it: it serves the embedded site on a
// local port, opens your browser at it, and stays running until you stop it.
// Nothing is written to disk, nothing leaves the machine.
package main

import (
	"embed"
	"flag"
	"fmt"
	"io/fs"
	"net"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"runtime"
	"syscall"
)

//go:embed index.html css js
var site embed.FS

const banner = `
  Kunwari — kunwaring may ginagawa
  A fake workday that runs itself.
`

func main() {
	port := flag.Int("port", 0, "port to serve on (0 picks a free one)")
	noOpen := flag.Bool("no-open", false, "don't open the browser automatically")
	flag.Parse()

	root, err := fs.Sub(site, ".")
	if err != nil {
		exit(err)
	}

	ln, err := net.Listen("tcp", fmt.Sprintf("127.0.0.1:%d", *port))
	if err != nil {
		exit(fmt.Errorf("could not open port %d: %w", *port, err))
	}
	url := fmt.Sprintf("http://%s/", ln.Addr().String())

	fmt.Print(banner)
	fmt.Printf("\n  Open:  %s\n  Stop:  ctrl-c\n\n", url)

	if !*noOpen {
		if err := open(url); err != nil {
			fmt.Printf("  (could not open a browser for you: %v)\n\n", err)
		}
	}

	go func() {
		mux := http.NewServeMux()
		mux.Handle("/", noCache(http.FileServer(http.FS(root))))
		if err := http.Serve(ln, mux); err != nil {
			exit(err)
		}
	}()

	// Wait for ctrl-c so the window stays put and the port stays open.
	sig := make(chan os.Signal, 1)
	signal.Notify(sig, os.Interrupt, syscall.SIGTERM)
	<-sig
	fmt.Println("\n  Back to work. 👋")
}

// The page is a simulation, not a document worth caching between runs.
func noCache(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		h.ServeHTTP(w, r)
	})
}

func open(url string) error {
	switch runtime.GOOS {
	case "darwin":
		return exec.Command("open", url).Start()
	case "windows":
		return exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
	default:
		return exec.Command("xdg-open", url).Start()
	}
}

func exit(err error) {
	fmt.Fprintf(os.Stderr, "kunwari: %v\n", err)
	os.Exit(1)
}
