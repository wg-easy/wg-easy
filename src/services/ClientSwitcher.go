package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/cookiejar"
	"os"
	"strings"
	"time"
)

type Client struct {
	ID           string    `json:"id"`
	Enabled      bool      `json:"enabled"`
	EnabledUntil time.Time `json:"enabledUntil"`
}

const (
	Api       = "api"
	Wireguard = "wireguard"
	ClientApi = "client"
	Session   = "session"
)

func makeRequest(client *http.Client, url string, method string) *http.Response {
	request, _ := http.NewRequest(method, url, nil)
	response, err := client.Do(request)
	if err != nil || response.StatusCode != 200 {
		fmt.Println(response)
		panic(response)
	}
	return response
}

func initClients(resp *http.Response, clients *[]Client) error {
	defer resp.Body.Close()
	return json.NewDecoder(resp.Body).Decode(clients)
}

func switchClientsStatus(httpClient *http.Client, clients []Client) {
	today := time.Now()
	for _, client := range clients {
		if client.EnabledUntil.Before(today) {
			switchStatus(httpClient, client.ID, "disable")
		} else if client.EnabledUntil.After(today) {
			switchStatus(httpClient, client.ID, "enable")
		}
	}
}

func switchStatus(client *http.Client, clientID, status string) {
	url := strings.Join([]string{getHost(), Api, Wireguard, ClientApi, clientID, status}, "/")
	makeRequest(client, url, "POST")
}

func checkAuth(client *http.Client) bool {
	type AuthChecker struct {
		RequiresPassword bool `json:"requiresPassword"`
		Authenticated    bool `json:"authenticated"`
	}
	var auth AuthChecker

	url := strings.Join([]string{getHost(), Api, Session}, "/")
	response := makeRequest(client, url, "GET")
	json.NewDecoder(response.Body).Decode(&auth)
	result := (auth.RequiresPassword && auth.Authenticated) || (!auth.RequiresPassword && auth.Authenticated)
	return result
}

func authenticate(client *http.Client) {
	args := os.Args[1:]
	type Password struct {
		Password string `json:"password"`
	}

	password := Password{
		Password: args[2],
	}
	url := strings.Join([]string{getHost(), Api, Session}, "/")
	passwdJson, _ := json.Marshal(password)

	req, _ := http.NewRequest("POST", url, bytes.NewBuffer(passwdJson))
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil || resp.StatusCode != 200 {
		fmt.Println(resp)
		panic(resp)
	}
	defer resp.Body.Close()
}

func getHost() string {
	args := os.Args[1:]
	host := args[0] + ":" + args[1]
	return host
}

func main() {
	getClientsUrl := strings.Join([]string{getHost(), Api, Wireguard, ClientApi}, "/")
	var clients []Client
	jar, _ := cookiejar.New(nil)
	client := &http.Client{Jar: jar}
	if !checkAuth(client) {
		authenticate(client)
	}

	resp := makeRequest(client, getClientsUrl, "GET")

	initClients(resp, &clients)
	switchClientsStatus(client, clients)
}
